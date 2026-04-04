# Tollgate: Multi-Tenant LLM API Gateway

> A database-centric API gateway for governing LLM usage across teams — handling authentication, quota enforcement, billing, and audit logging through transactional SQL.

[![Java](https://img.shields.io/badge/Java-17-007396?logo=openjdk)](https://openjdk.org/projects/jdk/17/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.4-6DB33F?logo=springboot)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![GCP](https://img.shields.io/badge/GCP-App%20Engine-4285F4?logo=googlecloud)](https://cloud.google.com/appengine)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Database Design](#database-design)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Query Workload](#query-workload)
- [Key Design Decisions](#key-design-decisions)
- [Engineering Highlights](doc/engineering-highlights.md)
- [Frontend Architecture](doc/frontend-architecture.md)
- [Design Language](doc/design-language.md)
- [Team](#team)

---

## Overview

When multiple teams share LLM infrastructure, three problems surface immediately: cost attribution becomes opaque, concurrent requests can blow past token budgets, and compliance audits have no structured trail to query. This project solves all three with a relational-database-first approach.

All LLM calls are routed through a single gateway endpoint. The gateway authenticates the caller, deducts quota inside a **pessimistic-lock transaction**, records the full request/response lifecycle, and exposes the data through a suite of analytical SQL endpoints.

**The LLM execution layer is intentionally mocked.** The project focus is schema design, transactional correctness, and query quality — the kinds of problems a real LLMOps platform must solve.

### What it handles

| Concern | Mechanism |
|---|---|
| Authentication | API key lookup by SHA-256 hash |
| Quota enforcement | `SELECT ... FOR UPDATE` on `monthly_quota` |
| Cost attribution | Per-request `computed_cost` from model pricing |
| Audit trail | `audit_log` linked to every allow/deny decision |
| Compliance | Structured queries over revoked-key usage and missing responses |
| Billing | Monthly invoice generation per project |

---

## Architecture

```
┌─────────────┐     X-API-Key      ┌──────────────────────────────────────┐
│   Client    │ ────────────────▶  │           API Gateway                │
│  (any HTTP) │                    │  ┌─────────────────────────────────┐  │
└─────────────┘                    │  │  1. Authenticate (key_hash)     │  │
                                   │  │  2. Check revocation status     │  │
                                   │  │  3. Lock quota row (FOR UPDATE) │  │
                                   │  │  4. Deduct tokens               │  │
                                   │  │  5. Mock LLM response           │  │
                                   │  │  6. Persist request + response  │  │
                                   │  └──────────────┬──────────────────┘  │
                                   └─────────────────│────────────────────-┘
                                                     │
                                   ┌─────────────────▼──────────────────┐
                                   │         PostgreSQL (GCP VM)         │
                                   │  tenant → project → api_key         │
                                   │  request → response / denied_event  │
                                   │  monthly_quota · invoice · audit_log│
                                   └────────────────────────────────────┘
```

**Infrastructure**

- **Database**: PostgreSQL 15 on GCP Compute Engine (e2-medium, us-central)
- **App Server**: Spring Boot 3.2.4 on Google App Engine Standard (Java 17)
- **Live URL**: https://database-llm-gateway.uc.r.appspot.com

---

## Database Design

The schema contains **11 relations** derived from a full Enhanced Entity-Relationship model. Two of them are weak entities (`response`, `denied_event`) that cannot exist without a parent `request`.

### Entity Hierarchy

```
tenant (1) ──── (N) project (1) ──── (N) api_key
                      │                     │
                      │ (1)                 │ (N)
                  monthly_quota          request (N) ──── (1) llm_model
                      │                     │                     │
                  invoice              ┌────┴────┐           model_pricing
                                    response  denied_event
                                               audit_log
```

### Schema Highlights

```sql
-- Quota deduction must be atomic under concurrency
SELECT tokens_used, token_limit
  FROM monthly_quota
 WHERE project_id = ? AND billing_month = ?
   FOR UPDATE;

-- One response per request, enforced at the constraint level
UNIQUE (request_id)  -- on response table

-- Idempotency within a project
UNIQUE (project_id, idempotency_key)  -- on request table

-- API key specialization: active vs revoked (single-table, discriminator column)
CHECK (status IN ('active', 'revoked'))
```

Full DDL: [`src/main/resources/schema.sql`](src/main/resources/schema.sql)

---

## API Reference

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tenants` | Create a tenant |
| `POST` | `/api/projects` | Create a project under a tenant |
| `POST` | `/api/keys` | Issue an API key (raw key returned once) |
| `PATCH` | `/api/keys/{keyId}/revoke` | Revoke a key |
| `POST` | `/api/models` | Register an LLM model |
| `POST` | `/api/pricing` | Set per-month token pricing for a model |
| `POST` | `/api/quotas` | Set monthly token quota for a project |

### Gateway

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/gateway/submit` | Submit an LLM request |

```http
POST /api/gateway/submit
X-API-Key: <raw-api-key>
Content-Type: application/json

{
  "modelId": 1,
  "inputTokens": 300,
  "idempotencyKey": "req-uuid-optional",
  "prompt": "Summarize this document."
}
```

**Possible responses**

| Status | Condition |
|---|---|
| `200 OK` | Quota available, mock response returned |
| `401` | API key not found |
| `403` | Key has been revoked |
| `429` | Monthly token quota exceeded |

### Reports & Audit

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/projects/{id}/cost?days=30` | Cost + token usage over N days |
| `GET` | `/api/reports/tenants/{id}/top-projects` | Top 5 projects by cost this month |
| `GET` | `/api/reports/models/stats` | Success rate, avg latency per model |
| `GET` | `/api/reports/quota-alerts` | Projects over 80% quota |
| `GET` | `/api/audit/keys/{keyId}/requests?from=&to=` | Request trail for a key |
| `GET` | `/api/audit/revoked-usage` | Requests made after key revocation |
| `GET` | `/api/audit/missing-responses` | Requests with no response record |
| `POST` | `/api/invoices/generate?billingMonth=2026-04` | Generate monthly invoices |

---

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- PostgreSQL 15 (local or remote)

### Local Setup

```bash
git clone https://github.com/Odiethebest/Tollgate.git
cd Tollgate
```

Create a local database:

```sql
CREATE DATABASE llm_gateway;
```

Create local environment file from template and update DB credentials:

```bash
cp .env.example .env
```

Load environment variables:

```bash
set -a
source .env
set +a
```

Run the service:

```bash
mvn spring-boot:run
```

Or run the full local stack (app + PostgreSQL) with Docker:

```bash
docker compose up --build
```

The app starts on `http://localhost:8080`. Schema and seed data are applied automatically on first boot.

### Quick Smoke Test

```bash
# Create a tenant
curl -X POST http://localhost:8080/api/tenants \
  -H "Content-Type: application/json" \
  -d '{"name":"TechCorp","contactEmail":"admin@techcorp.com"}'

# Submit a gateway request (replace key with one issued via /api/keys)
# Note: pricing/quota for current month must exist before submit.
curl -X POST http://localhost:8080/api/gateway/submit \
  -H "X-API-Key: <your-raw-key>" \
  -H "Content-Type: application/json" \
  -d '{"modelId":1,"inputTokens":200,"prompt":"Hello"}'
```

For a full end-to-end local demo sequence, see [`doc/local-run.md`](doc/local-run.md).

---

## Deployment

The app is deployed to **GCP App Engine Standard** with a **PostgreSQL instance on Compute Engine**.

```bash
# Package and deploy
mvn clean package -DskipTests
mvn appengine:deploy
```

Database credentials are injected via App Engine environment variables defined in `app.yaml`:

```yaml
env_variables:
  SPRING_DATASOURCE_URL: "jdbc:postgresql://<VM_IP>:5432/<DB_NAME>"
  SPRING_DATASOURCE_USERNAME: "<DB_USER>"
  SPRING_DATASOURCE_PASSWORD: "..."
```

The GCP firewall allows inbound TCP 5432 from App Engine service account IPs only.

---

## Query Workload

The system was designed around 20 analytical queries defined before schema implementation. A few representative examples:

**Q1 — Cost and token usage by project (last 30 days)**
```sql
SELECT p.name, SUM(r.computed_cost) AS total_cost,
       SUM(r.input_tokens + rs.output_tokens) AS total_tokens
  FROM request r
  JOIN response rs ON rs.request_id = r.request_id
  JOIN project p   ON p.project_id  = r.project_id
 WHERE r.requested_at >= NOW() - INTERVAL '30 days'
 GROUP BY p.project_id, p.name;
```

**Q19 — Compliance: requests made after key revocation**
```sql
SELECT r.request_id, r.requested_at, k.key_id, k.revoked_at
  FROM request r
  JOIN api_key k ON k.key_id = r.key_id
 WHERE k.status = 'revoked'
   AND r.requested_at > k.revoked_at;
```

**Q15 — Missing response anomaly detection**
```sql
SELECT request_id FROM request
EXCEPT
SELECT request_id FROM response;
```

More runnable examples and local validation steps are documented in [`doc/local-run.md`](doc/local-run.md).

---

## Key Design Decisions

**Denormalized `project_id` on `request`**
Strictly speaking, `project_id` is derivable via `api_key → project`. It is stored directly on `request` to avoid a join on every analytical query, which would be the hot path at scale.

**Single-table inheritance for API key lifecycle**
`ActiveKey` and `RevokedKey` are modeled as a discriminator column (`status`) rather than two separate tables. This keeps key lookups to a single index scan and avoids joins on the critical authentication path.

**Pessimistic locking for quota**
Optimistic locking (version column) would require retry logic in the application layer and still allows temporary overshoot. Pessimistic locking (`SELECT ... FOR UPDATE`) serializes quota deductions at the database level with no application-side retries needed, which is the correct choice for a hard budget constraint.

---

## Engineering Highlights

For a deeper walkthrough of the non-obvious technical decisions in this project — including why pessimistic locking was chosen over optimistic, how SHA-256 key hashing is structured, the rationale behind denormalization on `request`, and how transaction boundaries were designed for atomicity — see [`doc/engineering-highlights.md`](doc/engineering-highlights.md).

---

## Team

| Name             | Role |
|------------------|---|
| Runxin(Alex)Shao | Schema design, GCP deployment |
| Ziqi(Odie)Yang   | API implementation, transaction logic |

CS 5200 Database Management Systems — Northeastern University, Spring 2026
