CREATE TABLE IF NOT EXISTS tenant (
  tenant_id     SERIAL PRIMARY KEY,
  name          VARCHAR(100) UNIQUE NOT NULL,
  contact_email VARCHAR(200) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        VARCHAR(20) NOT NULL CHECK (status IN ('active','suspended'))
);

CREATE TABLE IF NOT EXISTS project (
  project_id    SERIAL PRIMARY KEY,
  tenant_id     INT NOT NULL REFERENCES tenant(tenant_id),
  name          VARCHAR(100) NOT NULL,
  environment   VARCHAR(20) NOT NULL CHECK (environment IN ('dev','staging','prod')),
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, name)
);

CREATE TABLE IF NOT EXISTS api_key (
  key_id        SERIAL PRIMARY KEY,
  project_id    INT NOT NULL REFERENCES project(project_id),
  key_hash      VARCHAR(64) UNIQUE NOT NULL,
  status        VARCHAR(20) NOT NULL CHECK (status IN ('active','revoked')),
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at    TIMESTAMP NULL,
  label         VARCHAR(100) NULL
);

CREATE TABLE IF NOT EXISTS llm_model (
  model_id      SERIAL PRIMARY KEY,
  provider      VARCHAR(50) NOT NULL,
  model_name    VARCHAR(100) NOT NULL,
  version       VARCHAR(50) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
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

CREATE INDEX IF NOT EXISTS idx_request_requested_at ON request(requested_at);
CREATE INDEX IF NOT EXISTS idx_request_project_id   ON request(project_id);
CREATE INDEX IF NOT EXISTS idx_request_key_id       ON request(key_id);
CREATE INDEX IF NOT EXISTS idx_request_model_id     ON request(model_id);
CREATE INDEX IF NOT EXISTS idx_denied_event_at      ON denied_event(denied_at);
CREATE INDEX IF NOT EXISTS idx_apikey_status        ON api_key(status);
