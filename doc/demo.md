# Tollgate Demo Guide

## 1. Recommended Local Setup

The most practical local setup is:

- PostgreSQL in Docker
- Spring Boot backend running locally
- Frontend either served by Spring Boot on port `8080` or by Vite on port `5173`

This keeps debugging simple and avoids rebuilding containers for every backend change.

---

## 2. Start the Database

From project root:

```bash
cd /Users/odieyang/Documents/Projects/Tollgate
docker compose up -d db
```

This starts:

- PostgreSQL on `localhost:5432`
- database name: `llm_gateway`
- username: `demo_user`
- password: `demo_pass`

Optional check:

```bash
docker ps
```

You should see `tollgate-postgres` in `healthy` state.

---

## 3. Start the Backend

From project root:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/llm_gateway
export SPRING_DATASOURCE_USERNAME=demo_user
export SPRING_DATASOURCE_PASSWORD=demo_pass

mvn spring-boot:run
```

Successful startup signs:

- log contains `Tomcat started on port 8080`
- log contains `Started DemoApplication`
- log contains `Demo API key ready`

Default demo API key:

```text
demo-1234-5678
```

This key is created automatically at startup and can be used directly in the gateway.

---

## 4. Start the Frontend

You have two options.

### Option A: Use Spring Boot static files

Open:

```text
http://localhost:8080
```

Use this when you just want to demo the app.

### Option B: Use Vite dev server

```bash
cd /Users/odieyang/Documents/Projects/Tollgate/dashboard
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

The frontend is configured to call `http://localhost:8080` by default, so this works without extra setup.

Note:

- if you change frontend code and want to view it through `http://localhost:8080`, run:

```bash
cd /Users/odieyang/Documents/Projects/Tollgate/dashboard
npm run build
```

This writes the built files into `src/main/resources/static`.

---

## 5. Manual Verification Checklist

This sequence is designed for presentation prep and manual QA.

Before running the gateway examples, define a fresh suffix:

```bash
RUN_ID=$(date +%s)
```

This avoids accidentally reusing the same `idempotencyKey`.

If you run the same request again with the same `idempotencyKey`, the system will intentionally return:

- `message: "Idempotent replay"`
- `idempotent: true`

### 5.1 Verify demo key and successful gateway request

```bash
curl -i -X POST http://localhost:8080/api/gateway/submit \
  -H "X-API-Key: demo-1234-5678" \
  -H "Content-Type: application/json" \
  -d "{\"modelId\":1,\"inputTokens\":120,\"idempotencyKey\":\"demo-success-$RUN_ID\",\"prompt\":\"hello\"}"
```

Expected:

- HTTP `200`
- response contains `status: "success"`

---

### 5.2 Verify triggerable failed path

```bash
curl -i -X POST http://localhost:8080/api/gateway/submit \
  -H "X-API-Key: demo-1234-5678" \
  -H "Content-Type: application/json" \
  -d "{\"modelId\":1,\"inputTokens\":120,\"idempotencyKey\":\"demo-fail-$RUN_ID\",\"prompt\":\"please __fail__ now\"}"
```

Expected:

- HTTP `502`
- response contains `status: "failed"`
- response contains `errorType: "LLM_SERVICE_ERROR"`

---

### 5.3 Verify read endpoints

```bash
MONTH=$(date +%Y-%m)

curl http://localhost:8080/api/tenants
curl "http://localhost:8080/api/projects?tenantId=1"
curl "http://localhost:8080/api/keys?projectId=1"
curl http://localhost:8080/api/models
curl "http://localhost:8080/api/quotas?projectId=1&billingMonth=$MONTH"
curl "http://localhost:8080/api/invoices?billingMonth=$MONTH"
```

Expected:

- all return HTTP `200`
- results are valid JSON lists

---

### 5.4 Verify suspended tenant path

Create a suspended tenant, project, and key:

```bash
TENANT_ID=$(curl -s -X POST http://localhost:8080/api/tenants \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"SuspendedTenant-$RUN_ID\",\"contactEmail\":\"s-$RUN_ID@local.test\",\"status\":\"suspended\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["tenantId"])')
```

Then create a project under that tenant:

```bash
PROJECT_ID=$(curl -s -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d "{\"tenantId\":$TENANT_ID,\"name\":\"suspended-proj-$RUN_ID\",\"environment\":\"dev\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["projectId"])')
```

Then issue a key:

```bash
RAW_KEY=$(curl -s -X POST http://localhost:8080/api/keys \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":$PROJECT_ID,\"label\":\"suspended-key-$RUN_ID\"}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["rawKey"])')
```

Optional check:

```bash
echo "$TENANT_ID"
echo "$PROJECT_ID"
echo "$RAW_KEY"
```

Then submit:

```bash
curl -i -X POST http://localhost:8080/api/gateway/submit \
  -H "X-API-Key: $RAW_KEY" \
  -H "Content-Type: application/json" \
  -d '{"modelId":1,"inputTokens":100,"prompt":"test"}'
```

Expected:

- HTTP `403`
- response contains `deniedReason: "TENANT_SUSPENDED"`

---

### 5.5 Verify inactive model path

Create an inactive model:

```bash
MONTH=$(date +%Y-%m)

MODEL_ID=$(curl -s -X POST http://localhost:8080/api/models \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"openai\",\"modelName\":\"inactive-demo-$RUN_ID\",\"version\":\"$MONTH\",\"isActive\":false}" \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["modelId"])')
```

Optional check:

```bash
echo "$MODEL_ID"
```

Then:

```bash
curl -i -X POST http://localhost:8080/api/gateway/submit \
  -H "X-API-Key: demo-1234-5678" \
  -H "Content-Type: application/json" \
  -d "{\"modelId\":$MODEL_ID,\"inputTokens\":100,\"prompt\":\"test\"}"
```

Expected:

- HTTP `400`
- response contains `deniedReason: "MODEL_UNAVAILABLE"`

---

### 5.6 Verify invoice generation and query

```bash
MONTH=$(date +%Y-%m)

curl -X POST "http://localhost:8080/api/invoices/generate?billingMonth=$MONTH"
curl "http://localhost:8080/api/invoices?billingMonth=$MONTH"
```

Expected:

- generate request returns invoice summary
- query request returns invoice list for that month

---

## 6. Database Verification

If you want to prove during demo that data is really written into PostgreSQL:

```bash
docker exec -it tollgate-postgres psql -U demo_user -d llm_gateway
```

Useful queries:

```sql
select request_id, status, input_tokens, computed_cost
from request
order by request_id desc
limit 10;

select request_id, http_status, error_type, latency_ms
from response
order by response_id desc
limit 10;

select request_id, action, performed_by, details
from audit_log
order by log_id desc
limit 15;
```

These three tables are enough to show:

- success flow
- failed flow
- denied flow
- audit coverage

---

## 7. Useful Error Checks

You can also verify invalid input handling for presentation.

Project lookup with nonexistent tenant:

```bash
curl -i "http://localhost:8080/api/projects?tenantId=999999"
```

Expected:

- HTTP `404`
- message `Tenant not found`

Invalid billing month for quotas:

```bash
curl -i "http://localhost:8080/api/quotas?projectId=1&billingMonth=bad-month"
```

Expected:

- HTTP `400`
- message `billingMonth must be formatted as YYYY-MM`

Invalid billing month for invoices:

```bash
curl -i "http://localhost:8080/api/invoices?billingMonth=bad-month"
```

Expected:

- HTTP `400`
- message `billingMonth must be formatted as YYYY-MM`

---

## 8. Reset Local Environment

The application no longer wipes data on restart.

If you want a fully clean local database:

```bash
docker compose down -v
docker compose up -d db
```

Then restart Spring Boot.

---

## 9. Recommended Presentation Demo Order

For a 5 to 6 minute demo, this order is the most stable:

1. Show dashboard or gateway page running locally
2. Show startup log with demo key
3. Submit one successful request
4. Submit one failed request using `__fail__`
5. Show one denied request case:
   suspended tenant or inactive model
6. Show create -> read flow:
   tenant, project, key, quota, invoice
7. Show PostgreSQL queries for `request`, `response`, and `audit_log`

This order highlights:

- CRUD
- query execution
- error handling
- transaction outcomes
- auditability
