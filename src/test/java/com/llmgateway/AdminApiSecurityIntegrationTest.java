package com.llmgateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.YearMonth;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

/**
 * Verifies the admin surface once {@code ADMIN_API_TOKEN} is configured. The token is supplied as
 * a test property, which also gives this class its own application context — the gateway tests
 * deliberately run without a token so they exercise the default, unauthenticated arrangement.
 */
@TestPropertySource(properties = "ADMIN_API_TOKEN=" + AdminApiSecurityIntegrationTest.TOKEN)
class AdminApiSecurityIntegrationTest extends AbstractIntegrationTest {

    static final String TOKEN = "test-admin-token";

    @Autowired
    private TestRestTemplate http;

    @ParameterizedTest(name = "{0} requires the admin token")
    @ValueSource(strings = {
            "/api/tenants",
            "/api/projects?tenantId=1",
            "/api/keys?projectId=1",
            "/api/models",
            "/api/quotas?projectId=1"
    })
    void protectedReadsAreRejectedWithoutTheToken(String path) {
        assertThat(get(path, null).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(get(path, TOKEN).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("a wrong token is refused as firmly as no token at all")
    void wrongTokenIsRefused() {
        assertThat(get("/api/tenants", "not-the-token").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("mutating routes are protected, not just the reads")
    void mutatingRoutesAreProtected() {
        HttpHeaders json = new HttpHeaders();
        json.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> createTenant = http.exchange(
                "/api/tenants", HttpMethod.POST,
                new HttpEntity<>("{\"name\":\"probe\",\"contactEmail\":\"probe@test.local\"}", json),
                String.class);
        assertThat(createTenant.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<String> revoke = http.exchange(
                "/api/keys/1/revoke", HttpMethod.PATCH, new HttpEntity<>(null, new HttpHeaders()), String.class);
        assertThat(revoke.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<String> generate = http.exchange(
                "/api/invoices/generate?billingMonth=" + YearMonth.now(), HttpMethod.POST,
                new HttpEntity<>(null, new HttpHeaders()), String.class);
        assertThat(generate.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @ParameterizedTest(name = "{0} stays open so the dashboard renders without credentials")
    @ValueSource(strings = {
            "/api/reports/models/stats",
            "/api/reports/quota-alerts",
            "/api/audit/revoked-usage",
            "/api/audit/missing-responses",
            "/api/audit/keys/1/requests"
    })
    void readOnlyDashboardRoutesStayOpen(String path) {
        assertThat(get(path, null).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("listing invoices stays open even though generating them does not")
    void listingInvoicesStaysOpen() {
        assertThat(get("/api/invoices?billingMonth=" + YearMonth.now(), null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("a CORS pre-flight passes the gate, so the browser can send the real request")
    void corsPreflightIsNotBlockedByTheTokenCheck() {
        // Spring keeps registered interceptors on the pre-flight handler chain. If OPTIONS were
        // challenged for a token the browser would never get as far as sending the POST, and the
        // failure would look like a CORS misconfiguration rather than an auth one.
        HttpHeaders preflight = new HttpHeaders();
        preflight.setOrigin("http://localhost:5173");
        preflight.setAccessControlRequestMethod(HttpMethod.POST);
        preflight.setAccessControlRequestHeaders(java.util.List.of("x-admin-token", "content-type"));

        ResponseEntity<String> response = http.exchange(
                "/api/tenants", HttpMethod.OPTIONS, new HttpEntity<>(preflight), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNotNull();
    }

    private ResponseEntity<String> get(String path, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (token != null) {
            headers.set("X-Admin-Token", token);
        }
        return http.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), String.class);
    }
}
