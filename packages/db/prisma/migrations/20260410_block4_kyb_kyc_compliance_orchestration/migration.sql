
ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS kyb_provider TEXT NULL,
  ADD COLUMN IF NOT EXISTS kyb_reference TEXT NULL,
  ADD COLUMN IF NOT EXISTS last_kyb_refresh_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS sanctions_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS risk_band TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS compliance_hold_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS ubo_declaration_status TEXT NOT NULL DEFAULT 'not_started';

CREATE TABLE IF NOT EXISTS compliance_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  case_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  risk_band TEXT NOT NULL DEFAULT 'medium',
  priority TEXT NOT NULL DEFAULT 'normal',
  initiated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  resolved_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  external_reference TEXT NULL,
  outcome_summary TEXT NULL,
  due_at TIMESTAMPTZ NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_cases_entity_status
  ON compliance_cases (entity_id, status, case_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_cases_entity_risk
  ON compliance_cases (entity_id, risk_band, updated_at DESC);

CREATE TABLE IF NOT EXISTS beneficial_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name_normalized TEXT NOT NULL,
  birth_date DATE NULL,
  nationality_country_code CHAR(2) NULL,
  residence_country_code CHAR(2) NULL,
  ownership_percent NUMERIC(5,2) NULL,
  control_type TEXT NULL,
  role_title TEXT NULL,
  identity_verification_status TEXT NOT NULL DEFAULT 'not_started',
  screening_status TEXT NOT NULL DEFAULT 'not_started',
  pep_declared BOOLEAN NOT NULL DEFAULT FALSE,
  sanctions_declared BOOLEAN NOT NULL DEFAULT FALSE,
  onfido_applicant_id TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficial_owners_entity
  ON beneficial_owners (entity_id, is_active, screening_status, ownership_percent DESC);

CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  case_id UUID NULL REFERENCES compliance_cases(id) ON DELETE SET NULL,
  beneficial_owner_id UUID NULL REFERENCES beneficial_owners(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  check_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  request_snapshot JSONB NULL,
  response_snapshot JSONB NULL,
  risk_score INTEGER NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_entity
  ON compliance_checks (entity_id, provider, status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_case
  ON compliance_checks (case_id, check_type);

CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  case_id UUID NULL REFERENCES compliance_cases(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user_upload',
  status TEXT NOT NULL DEFAULT 'submitted',
  review_notes TEXT NULL,
  issued_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_documents_entity
  ON compliance_documents (entity_id, status, document_type, created_at DESC);

CREATE TABLE IF NOT EXISTS compliance_screening_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  case_id UUID NULL REFERENCES compliance_cases(id) ON DELETE SET NULL,
  beneficial_owner_id UUID NULL REFERENCES beneficial_owners(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT NULL,
  matched_name TEXT NOT NULL,
  source_list TEXT NULL,
  match_score NUMERIC(5,2) NULL,
  resolution_status TEXT NOT NULL DEFAULT 'potential_match',
  resolution_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_screening_matches_entity
  ON compliance_screening_matches (entity_id, resolution_status, created_at DESC);

CREATE TABLE IF NOT EXISTS compliance_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES compliance_cases(id) ON DELETE CASCADE,
  actor_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  from_status TEXT NULL,
  to_status TEXT NULL,
  note TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_case_events_case
  ON compliance_case_events (case_id, created_at DESC);

CREATE TABLE IF NOT EXISTS compliance_review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  case_id UUID NULL REFERENCES compliance_cases(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NULL,
  resolution_notes TEXT NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_review_tasks_entity
  ON compliance_review_tasks (entity_id, status, priority, created_at ASC);
