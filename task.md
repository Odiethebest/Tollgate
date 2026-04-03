# Task: Build Multi-Tenant LLM API Gateway (CS5200 Database Project)

## Project Overview
You are implementing a **Multi-Tenant LLM API Gateway** for a database systems course project. The system acts as a unified entry point for LLM API calls, handling authentication, quota enforcement, billing, and audit logging. **The LLM itself is mocked** — the focus is on database design, transactional correctness, and SQL query quality.

The project is already deployed on GCP:
- **Database**: PostgreSQL on GCP Compute Engine (e2-medium, Ubuntu 20.04)
- **App Server**: Spring Boot on Google App Engine (Java 17)
- **App URL**: https://database-llm-gateway.uc.r.appspot.com/

## Tech Stack
- Java 17 + Spring Boot 3.x
- Spring Data JPA + Spring Web
- PostgreSQL (primary DB, InnoDB-equivalent: full transaction support)
- Maven build system (`pom.xml` already exists with Spring Web, Spring Data JPA, PostgreSQL Driver)
- `app.yaml` already configured for App Engine deployment

---

## Database Schema (from Phase 2 design — implement exactly as specified)

### Tables to create (PostgreSQL DDL):

```sql
-- R1
CREATE TABLE Tenant (
  tenant_id   SERIAL PRIMARY KEY,
  name        VARCHAR(100) UNIQUE NOT NULL,
  contact_email VARCHAR(200) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status      VARCHAR(20) NOT NULL CHECK (status IN ('active','suspended'))
);

-- R2
CREATE TABLE Project (
  project_id  SERIAL PRIMARY KEY,
  tenant_id   INT NOT NULL REFERENCES Tenant(tenant_id),
  name        VARCHAR(100) NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('dev','staging','prod')),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, name)
);

-- R3: single-table inheritance for ActiveKey / RevokedKey
CREATE TABLE ApiKey (
  key_id      SERIAL PRIMARY KEY,
  project_id  INT NOT NULL REFERENCES Project(project_id),
  key_hash    VARCHAR(64) UNIQUE NOT NULL,
  status      VARCHAR(20) NOT NULL CHECK (status IN ('active','revoked')),
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at  TIMESTAMP NULL,
  label       VARCHAR(100) NULL
);

-- R4
CREATE TABLE LlmModel (
  model_id    SERIAL PRIMARY KEY,
  provider    VARCHAR(50) NOT NULL,
  model_name  VARCHAR(100) NOT NULL,
  version     VARCHAR(50) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (provider, model_name, version)
);

-- R5
CREATE TABLE ModelPricing (
  pricing_id    SERIAL PRIMARY KEY,
  model_id      INT NOT NULL REFERENCES LlmModel(model_id),
  billing_month CHAR(7) NOT NULL,   -- YYYY-MM
  input_rate    DECIMAL(10,6) NOT NULL,
  output_rate   DECIMAL(10,6) NOT NULL,
  UNIQUE (model_id, billing_month)
);

-- R6
CREATE TABLE Request (
  request_id      SERIAL PRIMARY KEY,
  key_id          INT NOT NULL REFERENCES ApiKey(key_id),
  model_id        INT NOT NULL REFERENCES LlmModel(model_id),
  project_id      INT NOT NULL REFERENCES Project(project_id),
  requested_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  input_tokens    INT NOT NULL,
  status          VARCHAR(20) NOT NULL CHECK (status IN ('success','failed','denied')),
  idempotency_key VARCHAR(128) NULL,
  computed_cost   DECIMAL(12,6) NULL,
  environment     VARCHAR(20) NOT NULL CHECK (environment IN ('dev','staging','prod')),
  UNIQUE (project_id, idempotency_key)
);

-- R7: weak entity, 1:1 with Request
CREATE TABLE Response (
  response_id   SERIAL PRIMARY KEY,
  request_id    INT NOT NULL UNIQUE REFERENCES Request(request_id),
  output_tokens INT NULL,
  latency_ms    INT NULL,
  http_status   INT NULL,
  error_type    VARCHAR(100) NULL,
  raw_response  TEXT NULL,
  responded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- R8: weak entity, 1:N with Request
CREATE TABLE DeniedEvent (
  event_id      SERIAL PRIMARY KEY,
  request_id    INT NOT NULL REFERENCES Request(request_id),
  reason        VARCHAR(50) NOT NULL CHECK (reason IN ('QUOTA_EXCEEDED','RATE_LIMITED','KEY_REVOKED')),
  denied_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  threshold_pct DECIMAL(5,2) NULL
);

-- R9
CREATE TABLE MonthlyQuota (
  quota_id      SERIAL PRIMARY KEY,
  project_id    INT NOT NULL REFERENCES Project(project_id),
  billing_month CHAR(7) NOT NULL,
  token_limit   BIGINT NOT NULL,
  tokens_used   BIGINT NOT NULL DEFAULT 0,
  cost_limit    DECIMAL(12,2) NULL,
  UNIQUE (project_id, billing_month)
);

-- R10
CREATE TABLE Invoice (
  invoice_id    SERIAL PRIMARY KEY,
  project_id    INT NOT NULL REFERENCES Project(project_id),
  billing_month CHAR(7) NOT NULL,
  total_cost    DECIMAL(12,4) NOT NULL,
  total_tokens  BIGINT NOT NULL,
  issued_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid          BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (project_id, billing_month)
);

-- R11
CREATE TABLE AuditLog (
  log_id        SERIAL PRIMARY KEY,
  request_id    INT NULL REFERENCES Request(request_id),
  key_id        INT NULL REFERENCES ApiKey(key_id),
  action        VARCHAR(100) NOT NULL,
  performed_by  VARCHAR(100) NOT NULL,
  logged_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  details       TEXT NULL
);
```

### Indexes to add (performance-critical columns):
```sql
CREATE INDEX idx_request_requested_at ON Request(requested_at);
CREATE INDEX idx_request_project_id   ON Request(project_id);
CREATE INDEX idx_request_key_id       ON Request(key_id);
CREATE INDEX idx_request_model_id     ON Request(model_id);
CREATE INDEX idx_denied_event_denied_at ON DeniedEvent(denied_at);
CREATE INDEX idx_apikey_status        ON ApiKey(status);
```

---

## Core Business Logic to Implement

### 1. Transactional Quota Enforcement (most important)
When a request comes in, the following must happen **inside a single DB transaction**:

```
BEGIN
  SELECT tokens_used, token_limit FROM MonthlyQuota
  WHERE project_id = ? AND billing_month = ?
  FOR UPDATE;            -- pessimistic lock to prevent concurrent overspend

  IF tokens_used + input_tokens <= token_limit:
    UPDATE MonthlyQuota SET tokens_used = tokens_used + input_tokens WHERE ...
    INSERT INTO Request (status='success', computed_cost=...)
    INSERT into Response (mock output_tokens, latency_ms)
  ELSE:
    INSERT INTO Request (status='denied')
    INSERT INTO DeniedEvent (reason='QUOTA_EXCEEDED', threshold_pct=...)
    INSERT INTO AuditLog (action='QUOTA_EXCEEDED')
COMMIT
```

Also check before quota: if `ApiKey.status = 'revoked'`, deny with reason `KEY_REVOKED`.

### 2. Mock LLM Response
Generate fake `output_tokens` (random 50–500), `latency_ms` (random 200–3000), `http_status=200`. Compute cost as:
```
computed_cost = (input_tokens / 1000.0 * input_rate) + (output_tokens / 1000.0 * output_rate)
```
Pricing comes from `ModelPricing` where `billing_month = current YYYY-MM`.

---

## API Endpoints to Implement

### Admin
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tenants` | Create tenant |
| POST | `/api/projects` | Create project |
| POST | `/api/keys` | Issue API key (returns raw key, store SHA-256 hash) |
| PATCH | `/api/keys/{keyId}/revoke` | Revoke key, set revoked_at |
| POST | `/api/models` | Add model to catalog |
| POST | `/api/pricing` | Set model pricing for a billing month |
| POST | `/api/quotas` | Set monthly quota for a project |

### Client (Gateway)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/gateway/submit` | Submit LLM request (requires `X-API-Key` header) |

Request body:
```json
{ "modelId": 1, "inputTokens": 300, "idempotencyKey": "optional-uuid", "prompt": "Hello" }
```

### Reports & Audit
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/project/{projectId}/cost?days=30` | Q1: cost + tokens last N days |
| GET | `/api/reports/tenant/{tenantId}/top-projects` | Q2: top 5 projects by cost this month |
| GET | `/api/reports/models/stats` | Q3: success rate, avg latency per model |
| GET | `/api/reports/quota-alerts` | Q8: projects > 80% quota |
| GET | `/api/audit/key/{keyId}?from=&to=` | Q6: requests by key in time range |
| GET | `/api/audit/revoked-usage` | Q19: requests made after key revocation |
| GET | `/api/audit/missing-responses` | Q15: requests with no response record |
| POST | `/api/invoices/generate?billing_month=2026-03` | Generate invoice for all projects |

---

## Sample Data to Seed
Insert enough data to demonstrate all queries. Minimum:
- 3 tenants, 2 projects each (mix of dev/prod)
- 2 API keys per project (1 active, 1 revoked)
- 3 LLM models (e.g., gpt-4o/openai, claude-3-5-sonnet/anthropic, mistral-large/mistral)
- Pricing for current month for all models
- Monthly quota for each project
- At least 200 requests distributed across the last 90 days (mix of success/failed/denied)
- Responses for all success requests
- DeniedEvents for denied requests
- At least 1 project exceeding 80% quota
- At least 1 request made after key revocation (for compliance query)

Use a SQL seed script `src/main/resources/data.sql` or a `DataSeeder` component with `@PostConstruct`.

---

## Project Structure Expected
```
src/
  main/
    java/com/llmgateway/
      entity/          # JPA entities for all 11 tables
      repository/      # Spring Data JPA repositories
      service/         # Business logic (especially GatewayService with transaction)
      controller/      # REST controllers
      dto/             # Request/Response DTOs
    resources/
      application.properties   # DB connection config
      schema.sql               # DDL (all CREATE TABLE + indexes)
      data.sql                 # Seed data
```

---

## Key Constraints & Edge Cases to Handle
1. **Idempotency**: if `idempotency_key` already exists for a project, return the existing request result without re-processing.
2. **Revoked key check**: must happen before quota check.
3. **Missing pricing**: if no `ModelPricing` row exists for current month, return 400 with clear error.
4. **Concurrent quota**: use `@Transactional` + `SELECT ... FOR UPDATE` via a native query or `@Lock(LockModeType.PESSIMISTIC_WRITE)` on the quota repository.

---

## Deliverable Checklist
- [ ] `schema.sql` — all 11 tables + indexes + constraints
- [ ] JPA entities mapped to all tables
- [ ] `GatewayService.submitRequest()` with full transaction logic
- [ ] All admin + gateway + report REST endpoints working
- [ ] `data.sql` seed with realistic data covering all 20 query scenarios
- [ ] App deployable via `mvn appengine:deploy`