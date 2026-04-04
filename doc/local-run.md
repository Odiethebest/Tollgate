# Tollgate Local Run Guide

## 1. Purpose

This document describes how to run the Tollgate backend locally and validate the core API workflow end-to-end with `curl`.

It is intended for engineers who need a reproducible local setup for development, debugging, or demo.

## 2. Prerequisites

- macOS/Linux shell (examples use `zsh`/`bash`)
- Java 17+ available in `PATH`
- Maven 3.8+
- Docker (recommended for local PostgreSQL) or an existing PostgreSQL instance

## 3. Project Context

- Application: Spring Boot (`com.llmgateway`)
- Default HTTP port: `8080`
- DB initialization:
  - `spring.sql.init.mode=always`
  - `spring.jpa.defer-datasource-initialization=true`
  - `schema.sql` and `data.sql` are executed at startup

Important: startup loads seed data automatically. Do not point this local config to production databases.

## 4. Start PostgreSQL Locally (Docker)

```bash
docker run --name tollgate-pg \
  -e POSTGRES_DB=llm_gateway \
  -e POSTGRES_USER=demo_user \
  -e POSTGRES_PASSWORD=demo_pass \
  -p 5432:5432 \
  -d postgres:15
```

Health check:

```bash
docker exec -it tollgate-pg pg_isready -U demo_user -d llm_gateway
```

Expected output includes `accepting connections`.

## 5. Configure Environment Variables

Use the provided template:

```bash
cp .env.example .env
```

Recommended `.env` values for local demo:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/llm_gateway
SPRING_DATASOURCE_USERNAME=demo_user
SPRING_DATASOURCE_PASSWORD=demo_pass
```

Load environment variables into the current shell session:

```bash
set -a
source .env
set +a
```

Verify:

```bash
env | grep SPRING_DATASOURCE
```

## 6. Run the Backend

From project root:

```bash
cd /Users/odieyang/Documents/Projects/Tollgate
mvn spring-boot:run
```

Successful startup logs should include:

- `Tomcat initialized with port 8080`
- `Started DemoApplication`

## 7. End-to-End API Smoke Test (`curl`)

### 7.1 Create a tenant

```bash
curl -sS -X POST http://localhost:8080/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"DemoTenant","contactEmail":"demo@local.com","status":"active"}'
```

Capture `tenantId` from the response.

### 7.2 Create a project

```bash
curl -sS -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{"tenantId":<TENANT_ID>,"name":"demo-project","environment":"dev"}'
```

Capture `projectId`.

### 7.3 Issue API key

```bash
curl -sS -X POST http://localhost:8080/api/keys \
  -H "Content-Type: application/json" \
  -d '{"projectId":<PROJECT_ID>,"label":"demo-key"}'
```

Capture `rawKey` (returned once only).

### 7.4 Configure pricing for current month

```bash
MONTH=$(date +%Y-%m)
curl -sS -X POST http://localhost:8080/api/pricing \
  -H "Content-Type: application/json" \
  -d "{\"modelId\":1,\"billingMonth\":\"$MONTH\",\"inputRate\":0.005,\"outputRate\":0.015}"
```

### 7.5 Configure quota for current month

```bash
MONTH=$(date +%Y-%m)
curl -sS -X POST http://localhost:8080/api/quotas \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":<PROJECT_ID>,\"billingMonth\":\"$MONTH\",\"tokenLimit\":50000,\"costLimit\":200}"
```

### 7.6 Submit a gateway request

```bash
curl -sS -X POST http://localhost:8080/api/gateway/submit \
  -H "X-API-Key: <RAW_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"modelId":1,"inputTokens":300,"idempotencyKey":"demo-001","prompt":"hello"}'
```

Expected response shape:

```json
{
  "status": "success",
  "computedCost": 0.007200,
  "outputTokens": 380,
  "latencyMs": 2060
}
```

`outputTokens` and `latencyMs` are randomized in mock mode.

### 7.7 Validate reporting and audit APIs

```bash
curl -sS http://localhost:8080/api/reports/models/stats
curl -sS http://localhost:8080/api/reports/quota-alerts
curl -sS http://localhost:8080/api/audit/missing-responses
```

## 8. Troubleshooting

### Error: `SocketTimeoutException: Connect timed out`

Cause: application is trying to connect to unreachable database endpoint.

Fix:

- Ensure `.env` points to local PostgreSQL (`localhost:5432`)
- Reload env (`source .env`) in the same terminal
- Confirm PostgreSQL container is running

### Error: DB authentication failure

Fix:

- Verify `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`
- Validate manually:

```bash
psql "postgresql://demo_user:demo_pass@localhost:5432/llm_gateway"
```

### Reporting SQL syntax error near `:`

Fix already applied in repository: native report queries use `CAST(...)` (not `::`), compatible with JPA parameter parsing.

## 9. Stop and Clean Up

Stop application: `Ctrl + C`

Stop/remove PostgreSQL container:

```bash
docker stop tollgate-pg
docker rm tollgate-pg
```
