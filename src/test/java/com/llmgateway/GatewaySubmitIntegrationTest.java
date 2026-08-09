package com.llmgateway;

import static org.assertj.core.api.Assertions.assertThat;

import com.llmgateway.dto.ApiKeyResponse;
import com.llmgateway.dto.GatewaySubmitRequest;
import com.llmgateway.dto.GatewaySubmitResponse;
import com.llmgateway.entity.MonthlyQuota;
import com.llmgateway.entity.Project;
import com.llmgateway.entity.Tenant;
import com.llmgateway.repository.MonthlyQuotaRepository;
import com.llmgateway.repository.ProjectRepository;
import com.llmgateway.repository.TenantRepository;
import com.llmgateway.service.AdminService;
import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Covers the four correctness claims the README and doc/engineering-highlights make about
 * {@code POST /api/gateway/submit}: quota is debited exactly once on success, a request over the
 * limit is refused without touching the counter, a revoked key is refused, and an idempotency key
 * is never charged twice — including when the duplicate arrives concurrently.
 *
 * <p>Each test provisions its own tenant, project, key and quota so that nothing depends on
 * execution order or on the seed's mutable rows. The seeded model and its pricing are shared,
 * since pricing is read-only on this path.
 */
class GatewaySubmitIntegrationTest extends AbstractIntegrationTest {

    /** Seeded by data.sql as openai/gpt-4o, with pricing for the current month. */
    private static final long SEEDED_MODEL_ID = 1L;

    @Autowired
    private TestRestTemplate http;

    @Autowired
    private AdminService adminService;

    @Autowired
    private TenantRepository tenantRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private MonthlyQuotaRepository monthlyQuotaRepository;

    @Autowired
    private JdbcTemplate jdbc;

    // ---------------------------------------------------------------- tests

    @Test
    @DisplayName("seed covers the current billing month, so a fresh database can serve a request")
    void seedCoversTheCurrentBillingMonth() {
        assertThat(count("select count(*) from model_pricing where billing_month = ?", currentMonth()))
                .as("pricing rows for %s", currentMonth())
                .isPositive();
        assertThat(count("select count(*) from monthly_quota where billing_month = ?", currentMonth()))
                .as("quota rows for %s", currentMonth())
                .isPositive();
    }

    @Test
    @DisplayName("a successful request debits the quota once and writes the whole audit trail")
    void successfulRequestDebitsQuotaAndWritesTrail() {
        Fixture fixture = newProject(1_000L);

        ResponseEntity<GatewaySubmitResponse> response =
                submit(fixture.rawKey(), request(100, null, "summarise this"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        GatewaySubmitResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.status()).isEqualTo("success");
        assertThat(body.idempotent()).isFalse();
        assertThat(body.computedCost()).isNotNull().isGreaterThan(BigDecimal.ZERO);
        assertThat(body.outputTokens()).isNotNull();

        assertThat(tokensUsed(fixture)).isEqualTo(100L);

        Long requestId = body.requestId();
        assertThat(requestStatus(requestId)).isEqualTo("success");
        assertThat(count("select count(*) from response where request_id = ?", requestId)).isEqualTo(1);
        assertThat(count("select count(*) from denied_event where request_id = ?", requestId)).isZero();
        assertThat(auditActions(requestId)).containsExactly("REQUEST_ACCEPTED");
    }

    @Test
    @DisplayName("a request that exactly reaches the limit is still allowed")
    void requestThatExactlyReachesTheLimitIsAllowed() {
        Fixture fixture = newProject(200L);

        assertThat(submit(fixture.rawKey(), request(200, null, "exactly at the limit")).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(tokensUsed(fixture)).isEqualTo(200L);

        // One more token now crosses it.
        assertThat(submit(fixture.rawKey(), request(1, null, "one over")).getStatusCode())
                .isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(tokensUsed(fixture)).isEqualTo(200L);
    }

    @Test
    @DisplayName("a request over the limit is denied and the quota counter does not move")
    void requestOverTheLimitIsDeniedAndQuotaUntouched() {
        Fixture fixture = newProject(100L);

        ResponseEntity<GatewaySubmitResponse> response =
                submit(fixture.rawKey(), request(500, null, "far too big"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        GatewaySubmitResponse body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.status()).isEqualTo("denied");
        assertThat(body.deniedReason()).isEqualTo("QUOTA_EXCEEDED");
        assertThat(body.computedCost()).isNull();

        assertThat(tokensUsed(fixture)).isZero();

        Long requestId = body.requestId();
        assertThat(requestStatus(requestId)).isEqualTo("denied");
        assertThat(deniedReasons(requestId)).containsExactly("QUOTA_EXCEEDED");
        assertThat(count("select count(*) from response where request_id = ?", requestId)).isZero();
        assertThat(auditActions(requestId)).containsExactly("QUOTA_EXCEEDED");
    }

    @Test
    @DisplayName("a revoked key is refused, and repeating one idempotency key does not collide")
    void revokedKeyIsRefusedAndRepeatsDoNotCollide() {
        Fixture fixture = newProject(1_000L);
        adminService.revokeApiKey(fixture.keyId());

        String idempotencyKey = "revoked-" + UUID.randomUUID();
        for (int attempt = 1; attempt <= 3; attempt++) {
            ResponseEntity<GatewaySubmitResponse> response =
                    submit(fixture.rawKey(), request(50, idempotencyKey, "still trying"));

            assertThat(response.getStatusCode()).as("attempt %d", attempt).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().deniedReason()).isEqualTo("KEY_REVOKED");
        }

        assertThat(tokensUsed(fixture)).isZero();

        // Every attempt is recorded for compliance, and none of them carries the idempotency key —
        // that is what keeps the second attempt off UNIQUE (project_id, idempotency_key).
        assertThat(count("select count(*) from request where project_id = ?", fixture.projectId())).isEqualTo(3);
        assertThat(count(
                "select count(*) from request where project_id = ? and idempotency_key = ?",
                fixture.projectId(), idempotencyKey)).isZero();
    }

    @Test
    @DisplayName("replaying an idempotency key returns the original result and debits once")
    void replayingAnIdempotencyKeyDebitsOnce() {
        Fixture fixture = newProject(1_000L);
        String idempotencyKey = "replay-" + UUID.randomUUID();

        ResponseEntity<GatewaySubmitResponse> first =
                submit(fixture.rawKey(), request(80, idempotencyKey, "charge me once"));
        ResponseEntity<GatewaySubmitResponse> replay =
                submit(fixture.rawKey(), request(80, idempotencyKey, "charge me once"));

        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(replay.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(first.getBody()).isNotNull();
        assertThat(replay.getBody()).isNotNull();

        assertThat(first.getBody().idempotent()).isFalse();
        assertThat(replay.getBody().idempotent()).isTrue();
        assertThat(replay.getBody().requestId()).isEqualTo(first.getBody().requestId());
        assertThat(replay.getBody().computedCost()).isEqualByComparingTo(first.getBody().computedCost());
        assertThat(replay.getBody().outputTokens()).isEqualTo(first.getBody().outputTokens());

        assertThat(tokensUsed(fixture)).isEqualTo(80L);
        assertThat(count("select count(*) from request where project_id = ?", fixture.projectId())).isEqualTo(1);
    }

    @Test
    @DisplayName("concurrent submits sharing an idempotency key collapse into one charged request")
    void concurrentSubmitsSharingAnIdempotencyKeyCollapseIntoOne() throws Exception {
        Fixture fixture = newProject(10_000L);
        String idempotencyKey = "race-" + UUID.randomUUID();
        int callers = 12;

        ExecutorService pool = Executors.newFixedThreadPool(callers);
        CountDownLatch releaseAll = new CountDownLatch(1);
        List<Future<ResponseEntity<GatewaySubmitResponse>>> inFlight = new ArrayList<>();
        try {
            for (int i = 0; i < callers; i++) {
                inFlight.add(pool.submit(() -> {
                    releaseAll.await();
                    return submit(fixture.rawKey(), request(40, idempotencyKey, "race"));
                }));
            }
            releaseAll.countDown();

            List<GatewaySubmitResponse> bodies = new ArrayList<>();
            for (Future<ResponseEntity<GatewaySubmitResponse>> future : inFlight) {
                ResponseEntity<GatewaySubmitResponse> response = future.get(60, TimeUnit.SECONDS);
                assertThat(response.getStatusCode())
                        .as("a losing caller must be replayed, not failed")
                        .isEqualTo(HttpStatus.OK);
                bodies.add(response.getBody());
            }

            Long winningRequestId = bodies.get(0).requestId();
            assertThat(bodies).extracting(GatewaySubmitResponse::requestId).containsOnly(winningRequestId);
            assertThat(bodies).filteredOn(body -> !body.idempotent())
                    .as("exactly one caller performs the insert")
                    .hasSize(1);
        } finally {
            pool.shutdownNow();
        }

        assertThat(tokensUsed(fixture)).isEqualTo(40L);
        assertThat(count("select count(*) from request where project_id = ?", fixture.projectId())).isEqualTo(1);
    }

    // ------------------------------------------------------------- fixtures

    private record Fixture(Long projectId, Long keyId, String rawKey) {
    }

    private Fixture newProject(long tokenLimit) {
        String suffix = UUID.randomUUID().toString().substring(0, 12);

        Tenant tenant = new Tenant();
        tenant.setName("tenant-" + suffix);
        tenant.setContactEmail(suffix + "@test.local");
        tenant.setStatus("active");
        tenant = tenantRepository.save(tenant);

        Project project = new Project();
        project.setTenant(tenant);
        project.setName("project-" + suffix);
        project.setEnvironment("dev");
        project = projectRepository.save(project);

        MonthlyQuota quota = new MonthlyQuota();
        quota.setProject(project);
        quota.setBillingMonth(currentMonth());
        quota.setTokenLimit(tokenLimit);
        quota.setTokensUsed(0L);
        monthlyQuotaRepository.save(quota);

        String rawKey = "raw-" + suffix;
        ApiKeyResponse issued = adminService.issueApiKey(project.getProjectId(), "test-" + suffix, rawKey);
        return new Fixture(project.getProjectId(), issued.keyId(), rawKey);
    }

    // --------------------------------------------------------------- calling

    private static GatewaySubmitRequest request(int inputTokens, String idempotencyKey, String prompt) {
        return new GatewaySubmitRequest(SEEDED_MODEL_ID, inputTokens, idempotencyKey, prompt);
    }

    private ResponseEntity<GatewaySubmitResponse> submit(String rawKey, GatewaySubmitRequest body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-API-Key", rawKey);
        return http.exchange(
                "/api/gateway/submit",
                HttpMethod.POST,
                new HttpEntity<>(body, headers),
                GatewaySubmitResponse.class);
    }

    // ------------------------------------------------------------ assertions

    private static String currentMonth() {
        return YearMonth.now().toString();
    }

    private long tokensUsed(Fixture fixture) {
        Long used = jdbc.queryForObject(
                "select tokens_used from monthly_quota where project_id = ? and billing_month = ?",
                Long.class, fixture.projectId(), currentMonth());
        return used == null ? -1L : used;
    }

    private int count(String sql, Object... args) {
        Integer rows = jdbc.queryForObject(sql, Integer.class, args);
        return rows == null ? -1 : rows;
    }

    private String requestStatus(Long requestId) {
        return jdbc.queryForObject("select status from request where request_id = ?", String.class, requestId);
    }

    private List<String> deniedReasons(Long requestId) {
        return jdbc.queryForList("select reason from denied_event where request_id = ?", String.class, requestId);
    }

    private List<String> auditActions(Long requestId) {
        return jdbc.queryForList(
                "select action from audit_log where request_id = ? order by log_id", String.class, requestId);
    }
}
