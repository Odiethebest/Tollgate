-- Seed data is intentionally idempotent so application restarts do not
-- wipe out runtime-created records.
--
-- Billing months are derived from CURRENT_DATE rather than hard-coded. The gateway
-- resolves quota and pricing for YearMonth.now() on every submit, so a fixed month
-- would make a freshly seeded database reject the first request with
-- "No quota configured" on any date outside that month.

INSERT INTO tenant (name, contact_email, status) VALUES
  ('TechCorp', 'admin@techcorp.com', 'active'),
  ('StartupAI', 'ops@startupai.com', 'active'),
  ('ResearchLab', 'lab@research.org', 'active')
ON CONFLICT (name) DO NOTHING;

INSERT INTO project (tenant_id, name, environment)
SELECT t.tenant_id, v.project_name, v.environment
FROM (
  VALUES
    ('TechCorp', 'TechCorp-Dev', 'dev'),
    ('TechCorp', 'TechCorp-Prod', 'prod'),
    ('StartupAI', 'StartupAI-Dev', 'dev'),
    ('StartupAI', 'StartupAI-Prod', 'prod'),
    ('ResearchLab', 'ResearchLab-Dev', 'dev'),
    ('ResearchLab', 'ResearchLab-Prod', 'prod')
) AS v(tenant_name, project_name, environment)
JOIN tenant t ON t.name = v.tenant_name
ORDER BY t.tenant_id, v.project_name
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO api_key (project_id, key_hash, status, revoked_at, label)
SELECT p.project_id, v.key_hash, v.status, v.revoked_at, v.label
FROM (
  VALUES
    ('TechCorp-Dev', md5('tc-dev-active') || md5('tc-dev-active-v2'), 'active', NULL::TIMESTAMP, 'tc-dev-active'),
    ('TechCorp-Dev', md5('tc-dev-revoked') || md5('tc-dev-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '120 days', 'tc-dev-revoked'),
    ('TechCorp-Prod', md5('tc-prod-active') || md5('tc-prod-active-v2'), 'active', NULL::TIMESTAMP, 'tc-prod-active'),
    ('TechCorp-Prod', md5('tc-prod-revoked') || md5('tc-prod-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '95 days', 'tc-prod-revoked'),
    ('StartupAI-Dev', md5('sa-dev-active') || md5('sa-dev-active-v2'), 'active', NULL::TIMESTAMP, 'sa-dev-active'),
    ('StartupAI-Dev', md5('sa-dev-revoked') || md5('sa-dev-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '88 days', 'sa-dev-revoked'),
    ('StartupAI-Prod', md5('sa-prod-active') || md5('sa-prod-active-v2'), 'active', NULL::TIMESTAMP, 'sa-prod-active'),
    ('StartupAI-Prod', md5('sa-prod-revoked') || md5('sa-prod-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '130 days', 'sa-prod-revoked'),
    ('ResearchLab-Dev', md5('rl-dev-active') || md5('rl-dev-active-v2'), 'active', NULL::TIMESTAMP, 'rl-dev-active'),
    ('ResearchLab-Dev', md5('rl-dev-revoked') || md5('rl-dev-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '105 days', 'rl-dev-revoked'),
    ('ResearchLab-Prod', md5('rl-prod-active') || md5('rl-prod-active-v2'), 'active', NULL::TIMESTAMP, 'rl-prod-active'),
    ('ResearchLab-Prod', md5('rl-prod-revoked') || md5('rl-prod-revoked-v2'), 'revoked', CURRENT_TIMESTAMP - INTERVAL '99 days', 'rl-prod-revoked')
) AS v(project_name, key_hash, status, revoked_at, label)
JOIN project p ON p.name = v.project_name
ORDER BY p.project_id, v.label
ON CONFLICT (key_hash) DO NOTHING;

INSERT INTO llm_model (provider, model_name, version, is_active) VALUES
  ('openai', 'gpt-4o', '2026-04', TRUE),
  ('anthropic', 'claude-3-5-sonnet', '2026-04', TRUE),
  ('mistral', 'mistral-large', '2026-04', TRUE)
ON CONFLICT (provider, model_name, version) DO NOTHING;

-- Priced for the current month and the two before it. The join matches on the model's
-- own version string; billing_month is a separate axis and must not be derived from it.
INSERT INTO model_pricing (model_id, billing_month, input_rate, output_rate)
SELECT m.model_id, months.billing_month, v.input_rate, v.output_rate
FROM (
  VALUES
    ('openai', 'gpt-4o', '2026-04', 0.005000::DECIMAL(10,6), 0.015000::DECIMAL(10,6)),
    ('anthropic', 'claude-3-5-sonnet', '2026-04', 0.004000::DECIMAL(10,6), 0.012000::DECIMAL(10,6)),
    ('mistral', 'mistral-large', '2026-04', 0.003000::DECIMAL(10,6), 0.009000::DECIMAL(10,6))
) AS v(provider, model_name, version, input_rate, output_rate)
JOIN llm_model m
  ON m.provider = v.provider
 AND m.model_name = v.model_name
 AND m.version = v.version
CROSS JOIN (
  SELECT to_char(date_trunc('month', CURRENT_DATE) - (n || ' months')::INTERVAL, 'YYYY-MM') AS billing_month
  FROM generate_series(0, 2) AS n
) AS months
ON CONFLICT (model_id, billing_month) DO NOTHING;

INSERT INTO monthly_quota (project_id, billing_month, token_limit, tokens_used, cost_limit)
SELECT p.project_id, to_char(CURRENT_DATE, 'YYYY-MM'), v.token_limit, v.tokens_used, v.cost_limit
FROM (
  VALUES
    ('TechCorp-Dev', 12000::BIGINT, 7600::BIGINT, 300.00::DECIMAL(12,2)),
    ('TechCorp-Prod', 10000::BIGINT, 9100::BIGINT, 260.00::DECIMAL(12,2)),
    ('StartupAI-Dev', 15000::BIGINT, 6400::BIGINT, 320.00::DECIMAL(12,2)),
    ('StartupAI-Prod', 18000::BIGINT, 12500::BIGINT, 400.00::DECIMAL(12,2)),
    ('ResearchLab-Dev', 9000::BIGINT, 3800::BIGINT, 180.00::DECIMAL(12,2)),
    ('ResearchLab-Prod', 22000::BIGINT, 9700::BIGINT, 450.00::DECIMAL(12,2))
) AS v(project_name, token_limit, tokens_used, cost_limit)
JOIN project p ON p.name = v.project_name
ON CONFLICT (project_id, billing_month) DO NOTHING;

WITH project_slots AS (
  SELECT
    p.project_id,
    p.environment,
    ROW_NUMBER() OVER (
      ORDER BY CASE p.name
        WHEN 'TechCorp-Dev' THEN 1
        WHEN 'TechCorp-Prod' THEN 2
        WHEN 'StartupAI-Dev' THEN 3
        WHEN 'StartupAI-Prod' THEN 4
        WHEN 'ResearchLab-Dev' THEN 5
        WHEN 'ResearchLab-Prod' THEN 6
        ELSE 999
      END
    ) AS project_slot
  FROM project p
  WHERE p.name IN (
    'TechCorp-Dev',
    'TechCorp-Prod',
    'StartupAI-Dev',
    'StartupAI-Prod',
    'ResearchLab-Dev',
    'ResearchLab-Prod'
  )
),
model_slots AS (
  SELECT
    m.model_id,
    ROW_NUMBER() OVER (
      ORDER BY CASE m.provider
        WHEN 'openai' THEN 1
        WHEN 'anthropic' THEN 2
        WHEN 'mistral' THEN 3
        ELSE 999
      END,
      m.model_name
    ) AS model_slot
  FROM llm_model m
  WHERE (m.provider, m.model_name, m.version) IN (
    ('openai', 'gpt-4o', '2026-04'),
    ('anthropic', 'claude-3-5-sonnet', '2026-04'),
    ('mistral', 'mistral-large', '2026-04')
  )
),
key_slots AS (
  SELECT
    k.key_id,
    ROW_NUMBER() OVER (
      ORDER BY ps.project_slot,
               CASE k.label
                 WHEN 'tc-dev-active' THEN 1
                 WHEN 'tc-dev-revoked' THEN 2
                 WHEN 'tc-prod-active' THEN 1
                 WHEN 'tc-prod-revoked' THEN 2
                 WHEN 'sa-dev-active' THEN 1
                 WHEN 'sa-dev-revoked' THEN 2
                 WHEN 'sa-prod-active' THEN 1
                 WHEN 'sa-prod-revoked' THEN 2
                 WHEN 'rl-dev-active' THEN 1
                 WHEN 'rl-dev-revoked' THEN 2
                 WHEN 'rl-prod-active' THEN 1
                 WHEN 'rl-prod-revoked' THEN 2
                 ELSE 999
               END
    ) AS key_slot
  FROM api_key k
  JOIN project_slots ps ON ps.project_id = k.project_id
  WHERE k.label IN (
    'tc-dev-active',
    'tc-dev-revoked',
    'tc-prod-active',
    'tc-prod-revoked',
    'sa-dev-active',
    'sa-dev-revoked',
    'sa-prod-active',
    'sa-prod-revoked',
    'rl-dev-active',
    'rl-dev-revoked',
    'rl-prod-active',
    'rl-prod-revoked'
  )
),
generated_requests AS (
  SELECT
    gs AS n,
    ((gs - 1) % 6) + 1 AS project_slot,
    ((gs - 1) % 3) + 1 AS model_slot,
    CASE
      WHEN gs % 6 = 0 THEN (((((gs - 1) % 6) + 1) - 1) * 2 + 2)
      ELSE (((((gs - 1) % 6) + 1) - 1) * 2 + 1)
    END AS key_slot,
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
  ks.key_id,
  ms.model_id,
  ps.project_id,
  gr.requested_at,
  gr.input_tokens,
  gr.request_status,
  gr.idempotency_key,
  CASE
    WHEN gr.request_status = 'success'
      THEN ROUND(((gr.input_tokens / 1000.0) * (0.002 + ms.model_slot * 0.0025))::NUMERIC, 6)
    ELSE NULL
  END,
  ps.environment
FROM generated_requests gr
JOIN project_slots ps ON ps.project_slot = gr.project_slot
JOIN model_slots ms ON ms.model_slot = gr.model_slot
JOIN key_slots ks ON ks.key_slot = gr.key_slot
WHERE NOT EXISTS (SELECT 1 FROM request)
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
  AND r.request_id % 13 <> 0
  AND NOT EXISTS (SELECT 1 FROM response);

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
 AND q.billing_month = to_char(CURRENT_DATE, 'YYYY-MM')
WHERE r.status = 'denied'
  AND NOT EXISTS (SELECT 1 FROM denied_event);

-- Last month's invoices, issued on the 1st of the current month.
INSERT INTO invoice (project_id, billing_month, total_cost, total_tokens, issued_at, paid)
SELECT p.project_id,
       to_char(date_trunc('month', CURRENT_DATE) - INTERVAL '1 month', 'YYYY-MM'),
       v.total_cost,
       v.total_tokens,
       date_trunc('month', CURRENT_DATE) + INTERVAL '8 hours',
       v.paid
FROM (
  VALUES
    ('TechCorp-Dev', 120.4321::DECIMAL(12,4), 54000::BIGINT, FALSE),
    ('TechCorp-Prod', 260.9912::DECIMAL(12,4), 93000::BIGINT, FALSE),
    ('StartupAI-Dev', 88.1000::DECIMAL(12,4), 32000::BIGINT, TRUE),
    ('StartupAI-Prod', 310.8820::DECIMAL(12,4), 112000::BIGINT, FALSE),
    ('ResearchLab-Dev', 43.7788::DECIMAL(12,4), 14000::BIGINT, TRUE),
    ('ResearchLab-Prod', 0.0000::DECIMAL(12,4), 0::BIGINT, FALSE)
) AS v(project_name, total_cost, total_tokens, paid)
JOIN project p ON p.name = v.project_name
ON CONFLICT (project_id, billing_month) DO NOTHING;

INSERT INTO audit_log (request_id, key_id, action, performed_by, logged_at, details)
SELECT
  NULL,
  k.key_id,
  'KEY_REVOKED',
  'seed-admin',
  k.revoked_at,
  'Seeded revoked key: ' || k.label
FROM api_key k
WHERE k.status = 'revoked'
  AND NOT EXISTS (
    SELECT 1
    FROM audit_log existing
    WHERE existing.performed_by = 'seed-admin'
  );

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
WHERE d.reason IN ('QUOTA_EXCEEDED', 'KEY_REVOKED')
  AND NOT EXISTS (
    SELECT 1
    FROM audit_log existing
    WHERE existing.performed_by = 'gateway-seed'
  );
