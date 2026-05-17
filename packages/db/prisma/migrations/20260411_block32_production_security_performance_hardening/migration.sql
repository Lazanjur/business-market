CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_key VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  summary TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_severity_status
  ON security_incidents (severity, status);

CREATE TABLE IF NOT EXISTS runtime_guardrail_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment VARCHAR(30) NOT NULL,
  security_posture_score INTEGER NOT NULL,
  error_budget_remaining NUMERIC(5,2) NOT NULL,
  dead_letter_backlog INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_guardrail_env_created
  ON runtime_guardrail_snapshots (environment, created_at DESC);
