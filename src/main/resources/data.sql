TRUNCATE TABLE
  audit_log,
  invoice,
  denied_event,
  response,
  request,
  monthly_quota,
  model_pricing,
  llm_model,
  api_key,
  project,
  tenant
RESTART IDENTITY CASCADE;

INSERT INTO tenant (name, contact_email, status) VALUES
  ('TechCorp', 'admin@techcorp.com', 'active'),
  ('StartupAI', 'ops@startupai.com', 'active'),
  ('ResearchLab', 'lab@research.org', 'active');

INSERT INTO project (tenant_id, name, environment) VALUES
  (1, 'TechCorp-Dev', 'dev'),
  (1, 'TechCorp-Prod', 'prod'),
  (2, 'StartupAI-Dev', 'dev'),
  (2, 'StartupAI-Prod', 'prod'),
  (3, 'ResearchLab-Dev', 'dev'),
  (3, 'ResearchLab-Prod', 'prod');

INSERT INTO api_key (project_id, key_hash, status, revoked_at, label) VALUES
  (1, md5('tc-dev-active') || md5('tc-dev-active-v2'), 'active', NULL, 'tc-dev-active'),
  (1, md5('tc-dev-revoked') || md5('tc-dev-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '120 days', 'tc-dev-revoked'),
  (2, md5('tc-prod-active') || md5('tc-prod-active-v2'), 'active', NULL, 'tc-prod-active'),
  (2, md5('tc-prod-revoked') || md5('tc-prod-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '95 days', 'tc-prod-revoked'),
  (3, md5('sa-dev-active') || md5('sa-dev-active-v2'), 'active', NULL, 'sa-dev-active'),
  (3, md5('sa-dev-revoked') || md5('sa-dev-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '88 days', 'sa-dev-revoked'),
  (4, md5('sa-prod-active') || md5('sa-prod-active-v2'), 'active', NULL, 'sa-prod-active'),
  (4, md5('sa-prod-revoked') || md5('sa-prod-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '130 days', 'sa-prod-revoked'),
  (5, md5('rl-dev-active') || md5('rl-dev-active-v2'), 'active', NULL, 'rl-dev-active'),
  (5, md5('rl-dev-revoked') || md5('rl-dev-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '105 days', 'rl-dev-revoked'),
  (6, md5('rl-prod-active') || md5('rl-prod-active-v2'), 'active', NULL, 'rl-prod-active'),
  (6, md5('rl-prod-revoked') || md5('rl-prod-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '99 days', 'rl-prod-revoked');

INSERT INTO llm_model (provider, model_name, version, is_active) VALUES
  ('openai', 'gpt-4o', '2026-04', TRUE),
  ('anthropic', 'claude-3-5-sonnet', '2026-04', TRUE),
  ('mistral', 'mistral-large', '2026-04', TRUE);

INSERT INTO model_pricing (model_id, billing_month, input_rate, output_rate) VALUES
  (1, '2026-04', 0.005000, 0.015000),
  (2, '2026-04', 0.004000, 0.012000),
  (3, '2026-04', 0.003000, 0.009000);

INSERT INTO monthly_quota (project_id, billing_month, token_limit, tokens_used, cost_limit) VALUES
  (1, '2026-04', 12000, 7600, 300.00),
  (2, '2026-04', 10000, 9100, 260.00),
  (3, '2026-04', 15000, 6400, 320.00),
  (4, '2026-04', 18000, 12500, 400.00),
  (5, '2026-04', 9000, 3800, 180.00),
  (6, '2026-04', 22000, 9700, 450.00);

WITH generated_requests AS (
  SELECT
    gs AS n,
    ((gs - 1) % 6) + 1 AS project_id,
    ((gs - 1) % 3) + 1 AS model_id,
    CASE
      WHEN gs % 6 = 0 THEN (((((gs - 1) % 6) + 1) - 1) * 2 + 2)
      ELSE (((((gs - 1) % 6) + 1) - 1) * 2 + 1)
    END AS key_id,
    CURRENT_TIMESTAMP
      - ((gs % 90) || ' days')::INTERVAL
      + ((gs % 1440) || ' minutes')::INTERVAL AS requested_at,
    100 + (gs % 900) AS input_tokens,
    CASE
      WHEN gs % 20 IN (0, 1, 2) THEN 'denied'
      WHEN gs % 20 IN (3, 4, 5) THEN 'failed'
      ELSE 'success'
    END AS request_status,
    CASE
      WHEN ((gs - 1) % 6) + 1 IN (1, 3, 5) THEN 'dev'
      ELSE 'prod'
    END AS environment,
    CASE
      WHEN gs % 17 = 0 THEN 'seed-idem-' || gs
      ELSE NULL
    END AS idempotency_key
  FROM generate_series(1, 210) AS gs
)
INSERT INTO request (
  key_id,
  model_id,
  project_id,
  requested_at,
  input_tokens,
  status,
  idempotency_key,
  computed_cost,
  environment
)
SELECT
  gr.key_id,
  gr.model_id,
  gr.project_id,
  gr.requested_at,
  gr.input_tokens,
  gr.request_status,
  gr.idempotency_key,
  CASE
    WHEN gr.request_status = 'success'
      THEN ROUND(((gr.input_tokens / 1000.0) * (0.002 + gr.model_id * 0.0025))::NUMERIC, 6)
    ELSE NULL
  END,
  gr.environment
FROM generated_requests gr
ORDER BY gr.n;

INSERT INTO response (
  request_id,
  output_tokens,
  latency_ms,
  http_status,
  error_type,
  raw_response,
  responded_at
)
SELECT
  r.request_id,
  50 + (r.request_id % 451),
  200 + (r.request_id % 2801),
  200,
  NULL,
  'mock-response-' || r.request_id,
  r.requested_at + ((r.request_id % 5000) || ' milliseconds')::INTERVAL
FROM request r
WHERE r.status = 'success'
  AND r.request_id % 13 <> 0;

INSERT INTO denied_event (request_id, reason, denied_at, threshold_pct)
SELECT
  r.request_id,
  CASE
    WHEN k.status = 'revoked' AND k.revoked_at IS NOT NULL AND r.requested_at > k.revoked_at
      THEN 'KEY_REVOKED'
    ELSE 'QUOTA_EXCEEDED'
  END,
  r.requested_at + INTERVAL '5 milliseconds',
  ROUND((q.tokens_used * 100.0 / NULLIF(q.token_limit, 0))::NUMERIC, 2)
FROM request r
JOIN api_key k ON k.key_id = r.key_id
LEFT JOIN monthly_quota q
  ON q.project_id = r.project_id
 AND q.billing_month = '2026-04'
WHERE r.status = 'denied';

INSERT INTO invoice (project_id, billing_month, total_cost, total_tokens, issued_at, paid) VALUES
  (1, '2026-03', 120.4321, 54000, TIMESTAMP '2026-04-01 08:00:00', FALSE),
  (2, '2026-03', 260.9912, 93000, TIMESTAMP '2026-04-01 08:00:00', FALSE),
  (3, '2026-03', 88.1000, 32000, TIMESTAMP '2026-04-01 08:00:00', TRUE),
  (4, '2026-03', 310.8820, 112000, TIMESTAMP '2026-04-01 08:00:00', FALSE),
  (5, '2026-03', 43.7788, 14000, TIMESTAMP '2026-04-01 08:00:00', TRUE),
  (6, '2026-03', 0.0000, 0, TIMESTAMP '2026-04-01 08:00:00', FALSE);

INSERT INTO audit_log (request_id, key_id, action, performed_by, logged_at, details)
SELECT
  NULL,
  k.key_id,
  'KEY_REVOKED',
  'seed-admin',
  k.revoked_at,
  'Seeded revoked key: ' || k.label
FROM api_key k
WHERE k.status = 'revoked';

INSERT INTO audit_log (request_id, key_id, action, performed_by, logged_at, details)
SELECT
  d.request_id,
  r.key_id,
  d.reason,
  'gateway-seed',
  d.denied_at,
  'Denied event generated by seed data'
FROM denied_event d
JOIN request r ON r.request_id = d.request_id
WHERE d.reason IN ('QUOTA_EXCEEDED', 'KEY_REVOKED');
