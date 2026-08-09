# Engineering Highlights

This document explains the non-obvious technical decisions in Tollgate — why each was made, what alternatives were rejected, and what correctness properties it produces. It is written for software engineers evaluating the project.

---

## 1. Pessimistic Locking for Hard Budget Enforcement

### The Problem

Token quotas are a hard budget constraint: if two concurrent requests both read `tokens_used = 900` against a limit of `1000`, both see headroom and both proceed — resulting in `tokens_used = 1900`. This is a classic lost-update anomaly.

### The Decision

All quota deductions use a pessimistic write lock on the `monthly_quota` row for the duration of the transaction:

```sql
SELECT tokens_used, token_limit
  FROM monthly_quota
 WHERE project_id = :projectId AND billing_month = :billingMonth
   FOR UPDATE;
```

The Java layer mirrors this with `@Lock(LockModeType.PESSIMISTIC_WRITE)` on the repository method, so the lock is always held inside a `@Transactional` boundary:

```java
@Transactional
public GatewayResult submitRequest(String rawApiKey, GatewaySubmitRequest body) {
    MonthlyQuota quota = quotaRepo.findForUpdate(projectId, billingMonth)
        .orElseThrow(...);          // row-level lock acquired here

    if (quota.getTokensUsed() + body.getInputTokens() > quota.getTokenLimit()) {
        // persist DeniedEvent, return 429
    }
    quota.setTokensUsed(quota.getTokensUsed() + body.getInputTokens());
    // persist request + response
}                                   // lock released on commit
```

### Why Not Optimistic Locking

Optimistic locking (a `@Version` column) detects conflicts after the fact and requires the application to catch `OptimisticLockException` and retry. This means:

- Temporary overshoot is possible (two transactions both pass the check before either commits).
- Retry logic is a class of correctness bugs on its own.

For a hard budget, a pessimistic lock is strictly correct: the first conflicting transaction blocks until the preceding one commits, then reads the updated value and fails cleanly. No overshoot, no retries.

### Trade-off

Serialized writes to a hot quota row create a bottleneck under high concurrency for a single project. At the scale this system targets — multi-team governance within an organization — this is acceptable. A sharded counter or token-bucket cache would be the next step for order-of-magnitude higher throughput.

---

## 2. SHA-256 Key Hashing with One-Time Reveal

### The Problem

Storing plaintext API keys in a database means a database breach immediately compromises all callers. Storing a reversible hash provides no meaningful protection.

### The Decision

At key issuance, the gateway generates a random raw key (`UUID.randomUUID().toString()` in `AdminService.issueApiKey`), returns it to the caller **exactly once** in `ApiKeyResponse.rawKey`, and stores only the SHA-256 hex digest:

```java
// AdminService.issueApiKey(IssueApiKeyRequest)
return issueApiKey(request.projectId(), request.label(), UUID.randomUUID().toString());

// inside the overload
String keyHash = HashUtils.sha256Hex(normalizedRawKey);
// only keyHash is persisted; rawKey is returned in the response body and never stored
```

On every `POST /api/gateway/submit`, the `X-API-Key` header value is hashed before any database lookup:

```java
String keyHash = HashUtils.sha256Hex(rawApiKey);
ApiKey apiKey = apiKeyRepository.findByKeyHash(keyHash)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "API key not found"));
```

The `key_hash` column carries a `UNIQUE` index (declared on the column in `schema.sql`), so the lookup is an O(log n) index scan.

### Properties

- A full database dump reveals no usable credentials.
- There is no recovery path: a lost key must be revoked and a new one issued. This is intentional; it eliminates the attack surface of a "reset" endpoint.

---

## 3. Denormalized `project_id` on `request`

### The Normalization Argument

`project_id` is functionally determined by `key_id`: every API key belongs to exactly one project. Storing `project_id` directly on `request` therefore violates 3NF.

### Why It Is Stored Anyway

Every analytical query — cost attribution, quota reporting, audit trail, invoice generation — groups or filters by project. If `project_id` were not denormalized, every such query would require a join through `api_key`:

```sql
-- without denormalization
SELECT p.name, SUM(r.computed_cost)
  FROM request r
  JOIN api_key k ON k.key_id = r.key_id   -- extra join on every query
  JOIN project p ON p.project_id = k.project_id
 GROUP BY p.project_id;
```

The `request` table is the largest and most-queried table in the system. Eliminating a join from the hot read path at the cost of one extra foreign key column is a standard data warehouse pattern (denormalization for analytical access).

The consistency risk is negligible: `project_id` on a `request` row is set at write time and never updated. A key cannot be reassigned to a different project after creation.

---

## 4. Single-Table Inheritance for API Key Lifecycle

### The Alternatives

Two approaches for modeling `ActiveKey` / `RevokedKey`:

1. **Two tables** (`active_key`, `revoked_key`) with a row moved on revocation.
2. **Single table** with a `status` discriminator column (`active` / `revoked`).

### The Decision

Single table with a discriminator column. The authentication hot path is a single index scan against the `UNIQUE(key_hash)` constraint:

```sql
SELECT * FROM api_key WHERE key_hash = ?;
```

`GatewayService.submitRequest` then inspects `apiKey.getStatus()` in Java — when it is `"revoked"`, the gateway writes a `denied` `request`, a `denied_event(reason=KEY_REVOKED)`, an `audit_log` entry, and returns `403`. A separate `idx_apikey_status` index (`schema.sql`) supports the compliance scans that filter on `status` directly. A two-table model would require either a `UNION` across both tables or a lookup in `active_key` followed by a check against `revoked_key` on miss — extra round-trips on the most latency-sensitive path in the system.

Revocation is an `UPDATE` setting `status = 'revoked'` and stamping `revoked_at` (`AdminService.revokeApiKey`), rather than a `DELETE` + `INSERT`. This preserves the full foreign-key chain (`request → api_key`) for audit queries such as `findRevokedKeyUsage`, which joins requests against `api_key` to find calls that arrived **after** the revocation timestamp.

---

## 5. Weak Entities: `response` and `denied_event`

### Design Rationale

`response` and `denied_event` are modeled as weak entities: they have no independent existence and cannot be created without a parent `request`. This is enforced at the schema level:

```sql
-- response
request_id INT NOT NULL UNIQUE REFERENCES request(request_id),  -- exactly one response per request

-- denied_event
request_id INT NOT NULL REFERENCES request(request_id)
```

The `UNIQUE (request_id)` constraint on `response` is stronger than a foreign key alone — it makes the relationship a true 1:1 participation constraint, not just a 1:N with an expected maximum of one.

### What This Enables

The `EXCEPT` query for anomaly detection is structurally clean because the invariant is schema-enforced, not just application-enforced:

```sql
-- requests with no associated response (data anomaly detection)
SELECT request_id FROM request
EXCEPT
SELECT request_id FROM response;
```

---

## 6. Idempotency at the Schema Level

### The Problem

Network timeouts cause clients to retry. Without idempotency, a retry creates a duplicate request and deducts quota twice.

### The Decision

An optional `idempotency_key` column on `request` carries a composite unique constraint:

```sql
UNIQUE (project_id, idempotency_key)
```

At the service layer, before any quota check, the gateway queries for a matching `(project_id, idempotency_key)` pair. If found, the original response is returned without touching the quota row. The unique constraint is the backstop: even if two identical requests arrive simultaneously, only one can commit; the other gets a unique-constraint violation that the service translates into a cache hit.

Idempotency scope is per-project (not per-key), which means a caller can rotate keys without invalidating pending idempotency windows.

---

## 7. `computed_cost` at Request Time vs. Invoice Time

### The Trade-off

Cost could be computed at invoice generation time by joining `request` against `model_pricing` for the relevant billing month. This keeps the `request` row narrower.

However, `model_pricing` is mutable: rates can be adjusted retroactively. Computing `computed_cost` at request time and storing it creates an immutable record of what was charged at the moment of consumption. Invoice generation then aggregates pre-computed costs per project (`GatewayRequestRepository.getInvoiceAggregate`):

```sql
SELECT COALESCE(SUM(r.computed_cost), 0) AS totalCost,
       CAST(COALESCE(SUM(r.input_tokens + COALESCE(rs.output_tokens, 0)), 0) AS BIGINT) AS totalTokens
  FROM request r
  LEFT JOIN response rs ON rs.request_id = r.request_id
 WHERE r.project_id = :projectId
   AND r.status = 'success'
   AND to_char(r.requested_at, 'YYYY-MM') = :billingMonth;
```

`computed_cost` is set to `NULL` on `denied` and `failed` rows in `GatewayService`, so the cost `SUM` would exclude them on its own. The explicit `status = 'success'` filter is there for the **token** total: `input_tokens` is recorded on every row regardless of outcome, so without the filter a request that was denied for exceeding quota would still be billed as consumed tokens. Both columns must describe the same set of requests, or the invoice reports a token count the cost cannot be reconciled against. The same filter applies to `getProjectCostAndTokens`, which backs the per-project cost report.

Beyond that, invoice generation stays a pure aggregation: no pricing joins, and no sensitivity to pricing changes after the fact.

---

## 8. Repository Projections for Aggregate Queries

### The Problem

JPA's default behavior when returning aggregate query results is to return `Object[]` arrays, which require positional casting and break at compile time if the query changes.

### The Decision

All analytical queries return typed Spring Data projections:

```java
public interface ModelStatsProjection {
    Long getModelId();
    String getProvider();
    String getModelName();
    BigDecimal getSuccessRate();
    BigDecimal getAvgLatencyMs();
    Long getTotalRequests();
}
```

The repository method returns `List<ModelStatsProjection>`, which the service (`ReportService.getModelStats`) maps to `ModelStatsResponse`. This provides:

- Compile-time field name checking.
- Zero-boilerplate column mapping (Spring Data proxies the interface).
- Clean separation between the query result shape and the API response shape.

---

## 9. Transaction Boundary Design

Every write in the gateway submit flow is a single `@Transactional` method (`GatewayService.submitRequest`) covering:

1. API key lookup (by SHA-256 hash) and idempotency check
2. Quota row lock acquisition (`MonthlyQuotaRepository.findForUpdate`, `@Lock(PESSIMISTIC_WRITE)`)
3. Quota deduction (`tokens_used += input_tokens`)
4. `GatewayRequest` persist with status `success` / `denied` / `failed`
5. `GatewayResponse` persist on success / failure paths; `DeniedEvent` persist on denied paths
6. `AuditLog` persist with one of `REQUEST_ACCEPTED / REQUEST_FAILED / KEY_REVOKED / QUOTA_EXCEEDED / TENANT_SUSPENDED / MODEL_UNAVAILABLE`

If any step fails, the entire transaction rolls back: no quota is deducted without a corresponding request record, and no request record exists without an audit-log entry. This eliminates a class of partial-write inconsistencies that would otherwise require reconciliation jobs.

The read-only admin list endpoints use `@Transactional(readOnly = true)`, which lets the JPA session skip dirty-checking on the result set.

---

## 10. Schema Initialization Strategy

The project uses `spring.jpa.hibernate.ddl-auto=none` — Hibernate does not generate or modify the schema. DDL is owned by `schema.sql`, loaded via `spring.sql.init.mode=always`. This means:

- The schema is version-controlled and reviewable as plain SQL, not inferred from entity annotations.
- Local dev and production use the same DDL.
- Hibernate's auto-generation (which produces subtly different SQL across providers) is eliminated as a source of schema drift.

Seed data in `data.sql` is loaded in the same initialization pass, providing 3 tenants, 6 projects, 12 API keys, 3 LLM models, and 210 mock requests for immediate query validation without manual setup.

Every timestamp and `billing_month` in the seed is derived from `CURRENT_DATE`, not written as a literal. The gateway resolves quota and pricing for `YearMonth.now()` on each submit, so a fixed month would leave a freshly seeded database rejecting its first request with `No quota configured` on any date outside that month — the seed would silently expire. The `project` and `api_key` inserts also carry an explicit `ORDER BY`, so `SERIAL` values are assigned in a stable order and references such as "project 1 is TechCorp-Dev" hold across rebuilds.
