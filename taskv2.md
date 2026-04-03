# Task: Implement Multi-Tenant LLM API Gateway on Existing Spring Boot Skeleton

## Current Codebase State
The project skeleton already exists at `AI-API-Gateway-Server/`. Do NOT recreate or modify:
- `pom.xml` — already has spring-boot-starter-web, spring-boot-starter-data-jpa, postgresql driver, spring-boot-starter-test
- `app.yaml` — already configured for GCP App Engine (java17, injects SPRING_DATASOURCE_* env vars)
- `src/main/resources/application.properties` — already has port 8080, PostgreSQL connection, JPA ddl-auto=update, SQL logging

What exists in src/main/java/com/example/demo/:
- `DemoApplication.java` — main class with @SpringBootApplication, keep as-is
- `HelloController.java` — single GET / endpoint returning "Hello from Spring Boot on GCP!", you can delete this file

## What You Need to Build
Implement the full business layer from scratch under `src/main/java/com/example/demo/`. The package structure to create:

```
com/example/demo/
  entity/        ← JPA entities (11 tables)
  repository/    ← Spring Data JPA repositories
  service/       ← Business logic
  controller/    ← REST controllers
  dto/           ← Request/Response DTOs
```

Also create:
- `src/main/resources/schema.sql` — DDL for all tables + indexes
- `src/main/resources/data.sql` — seed data

---

## Database Schema (PostgreSQL — implement exactly as specified)

```sql
-- schema.sql

CREATE TABLE IF NOT EXISTS tenant (
  tenant_id     SERIAL PRIMARY KEY,
  name          VARCHAR(100) UNIQUE NOT NULL,
  contact_email VARCHAR(200) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        VARCHAR(20) NOT NULL CHECK (status IN ('active','suspended'))
);

CREATE TABLE IF NOT EXISTS project (
  project_id  SERIAL PRIMARY KEY,
  tenant_id   INT NOT NULL REFERENCES tenant(tenant_id),
  name        VARCHAR(100) NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('dev','staging','prod')),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS api_key (
  key_id      SERIAL PRIMARY KEY,
  project_id  INT NOT NULL REFERENCES project(project_id),
  key_hash    VARCHAR(64) UNIQUE NOT NULL,
  status      VARCHAR(20) NOT NULL CHECK (status IN ('active','revoked')),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at  TIMESTAMP NULL,
  label       VARCHAR(100) NULL
);

CREATE TABLE IF NOT EXISTS llm_model (
  model_id    SERIAL PRIMARY KEY,
  provider    VARCHAR(50) NOT NULL,
  model_name  VARCHAR(100) NOT NULL,
  version     VARCHAR(50) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (provider, model_name, version)
);

CREATE TABLE IF NOT EXISTS model_pricing (
  pricing_id    SERIAL PRIMARY KEY,
  model_id      INT NOT NULL REFERENCES llm_model(model_id),
  billing_month CHAR(7) NOT NULL,
  input_rate    DECIMAL(10,6) NOT NULL,
  output_rate   DECIMAL(10,6) NOT NULL,
  UNIQUE (model_id, billing_month)
);

CREATE TABLE IF NOT EXISTS request (
  request_id      SERIAL PRIMARY KEY,
  key_id          INT NOT NULL REFERENCES api_key(key_id),
  model_id        INT NOT NULL REFERENCES llm_model(model_id),
  project_id      INT NOT NULL REFERENCES project(project_id),
  requested_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  input_tokens    INT NOT NULL,
  status          VARCHAR(20) NOT NULL CHECK (status IN ('success','failed','denied')),
  idempotency_key VARCHAR(128) NULL,
  computed_cost   DECIMAL(12,6) NULL,
  environment     VARCHAR(20) NOT NULL CHECK (environment IN ('dev','staging','prod')),
  UNIQUE (project_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS response (
  response_id   SERIAL PRIMARY KEY,
  request_id    INT NOT NULL UNIQUE REFERENCES request(request_id),
  output_tokens INT NULL,
  latency_ms    INT NULL,
  http_status   INT NULL,
  error_type    VARCHAR(100) NULL,
  raw_response  TEXT NULL,
  responded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS denied_event (
  event_id      SERIAL PRIMARY KEY,
  request_id    INT NOT NULL REFERENCES request(request_id),
  reason        VARCHAR(50) NOT NULL CHECK (reason IN ('QUOTA_EXCEEDED','RATE_LIMITED','KEY_REVOKED')),
  denied_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  threshold_pct DECIMAL(5,2) NULL
);

CREATE TABLE IF NOT EXISTS monthly_quota (
  quota_id      SERIAL PRIMARY KEY,
  project_id    INT NOT NULL REFERENCES project(project_id),
  billing_month CHAR(7) NOT NULL,
  token_limit   BIGINT NOT NULL,
  tokens_used   BIGINT NOT NULL DEFAULT 0,
  cost_limit    DECIMAL(12,2) NULL,
  UNIQUE (project_id, billing_month)
);

CREATE TABLE IF NOT EXISTS invoice (
  invoice_id    SERIAL PRIMARY KEY,
  project_id    INT NOT NULL REFERENCES project(project_id),
  billing_month CHAR(7) NOT NULL,
  total_cost    DECIMAL(12,4) NOT NULL,
  total_tokens  BIGINT NOT NULL,
  issued_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid          BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (project_id, billing_month)
);

CREATE TABLE IF NOT EXISTS audit_log (
  log_id        SERIAL PRIMARY KEY,
  request_id    INT NULL REFERENCES request(request_id),
  key_id        INT NULL REFERENCES api_key(key_id),
  action        VARCHAR(100) NOT NULL,
  performed_by  VARCHAR(100) NOT NULL,
  logged_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details       TEXT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_request_requested_at ON request(requested_at);
CREATE INDEX IF NOT EXISTS idx_request_project_id   ON request(project_id);
CREATE INDEX IF NOT EXISTS idx_request_key_id       ON request(key_id);
CREATE INDEX IF NOT EXISTS idx_request_model_id     ON request(model_id);
CREATE INDEX IF NOT EXISTS idx_denied_event_at      ON denied_event(denied_at);
CREATE INDEX IF NOT EXISTS idx_apikey_status        ON api_key(status);
```

**Important**: since `application.properties` already has `ddl-auto=update`, change it to `ddl-auto=none` and add these two lines so schema.sql and data.sql are picked up:
```properties
spring.sql.init.mode=always
spring.jpa.defer-datasource-initialization=true
```

---

## API Endpoints to Implement

### Admin Endpoints
```
POST   /api/tenants                         create tenant
POST   /api/projects                        create project (body: tenantId, name, environment)
POST   /api/keys                            issue API key (body: projectId, label)
                                            → generate random UUID as raw key, store SHA-256 hash
                                            → return the raw key ONCE (not stored)
PATCH  /api/keys/{keyId}/revoke             revoke key, set revoked_at = now()
POST   /api/models                          add model (provider, modelName, version)
POST   /api/pricing                         set pricing (modelId, billingMonth YYYY-MM, inputRate, outputRate)
POST   /api/quotas                          set monthly quota (projectId, billingMonth, tokenLimit, costLimit)
```

### Gateway Endpoint (core)
```
POST   /api/gateway/submit
  Header: X-API-Key: <raw key>
  Body:   { "modelId": 1, "inputTokens": 300, "idempotencyKey": "optional", "prompt": "hello" }
```

### Report & Audit Endpoints
```
GET  /api/reports/projects/{projectId}/cost?days=30      Q1
GET  /api/reports/tenants/{tenantId}/top-projects        Q2
GET  /api/reports/models/stats                           Q3
GET  /api/reports/quota-alerts                           Q8: projects > 80% quota used
GET  /api/audit/keys/{keyId}/requests?from=&to=          Q6
GET  /api/audit/revoked-usage                            Q19
GET  /api/audit/missing-responses                        Q15
POST /api/invoices/generate?billingMonth=2026-04         generate invoices for all projects
```

---

## Core Business Logic: GatewayService.submitRequest()

This is the most important method. It must run inside a single `@Transactional` block:

```
1. Look up ApiKey by SHA-256(rawKey). If not found → 401.
2. If key.status == 'revoked':
   → INSERT request (status='denied')
   → INSERT denied_event (reason='KEY_REVOKED')
   → INSERT audit_log (action='KEY_REVOKED')
   → return 403

3. Load MonthlyQuota WHERE project_id=? AND billing_month=currentMonth
   using PESSIMISTIC_WRITE lock (@Lock(LockModeType.PESSIMISTIC_WRITE))

4. If quota not found → 400 "No quota configured"

5. Load ModelPricing WHERE model_id=? AND billing_month=currentMonth
   If not found → 400 "No pricing configured"

6. Check idempotency: if idempotency_key exists for this project → return existing request result

7. Mock LLM response:
   outputTokens = random(50, 500)
   latencyMs    = random(200, 3000)
   computedCost = (inputTokens/1000.0 * inputRate) + (outputTokens/1000.0 * outputRate)

8. If quota.tokensUsed + inputTokens > quota.tokenLimit:
   → INSERT request (status='denied')
   → INSERT denied_event (reason='QUOTA_EXCEEDED', threshold_pct = tokensUsed*100/tokenLimit)
   → INSERT audit_log (action='QUOTA_EXCEEDED')
   → return 429

9. UPDATE monthly_quota SET tokens_used = tokens_used + inputTokens
10. INSERT request (status='success', computedCost=...)
11. INSERT response (outputTokens, latencyMs, httpStatus=200)
12. return 200 with request + response details
```

---

## Seed Data (data.sql)

Insert realistic data that covers all 20 query scenarios:

- 3 tenants: TechCorp, StartupAI, ResearchLab
- 2 projects per tenant (1 dev, 1 prod) = 6 projects total
- 2 API keys per project: 1 active, 1 revoked (revoked_at set in the past)
- 3 LLM models: gpt-4o (openai), claude-3-5-sonnet (anthropic), mistral-large (mistral)
- Pricing for 2026-04 for all 3 models
- Monthly quota for each project for 2026-04 (vary token_limit: some tight, some generous)
- ~200 request rows spanning the past 90 days, distributed across projects/keys/models
    - Mix: ~70% success, ~15% failed, ~15% denied
    - At least 1 project with tokens_used > 80% of token_limit
    - At least 5 requests made AFTER their key's revoked_at (for Q19 compliance check)
    - At least 10 success requests with no matching response row (for Q15 missing-response check)
- Response rows for all success requests (except the 10 intentionally missing)
- DeniedEvent rows for all denied requests
- Invoice rows for 2026-03 for all projects (including 1 project with total_tokens=0 for Q18)
- AuditLog rows for key revocations and quota exceeded events

---

## Deliverable Checklist
- [ ] `src/main/resources/schema.sql` with all 11 tables + indexes
- [ ] `src/main/resources/data.sql` with seed data covering all query scenarios
- [ ] `application.properties` updated: ddl-auto=none, sql.init.mode=always
- [ ] JPA entity classes for all 11 tables (use snake_case column names via @Column)
- [ ] Repository interfaces (extend JpaRepository; add custom @Query methods as needed)
- [ ] `GatewayService` with full `@Transactional` submit logic including PESSIMISTIC_WRITE lock
- [ ] All admin + gateway + report REST controllers returning proper HTTP status codes
- [ ] `HelloController.java` deleted or replaced
- [ ] App builds cleanly with `mvn clean package -DskipTests`