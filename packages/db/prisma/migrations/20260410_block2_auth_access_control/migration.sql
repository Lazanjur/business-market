CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE entities
  ADD CONSTRAINT entities_no_individuals_chk
  CHECK (entity_type <> 'individual');

CREATE TABLE IF NOT EXISTS entity_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  membership_role TEXT NOT NULL DEFAULT 'member',
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  invited_by UUID NULL REFERENCES users(id),
  invited_at TIMESTAMPTZ NULL,
  joined_at TIMESTAMPTZ NULL,
  last_elevated_at TIMESTAMPTZ NULL,
  removed_at TIMESTAMPTZ NULL,
  removed_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_memberships_lookup
  ON entity_memberships (entity_id, membership_role, status);

CREATE TABLE IF NOT EXISTS entity_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  membership_role TEXT NOT NULL DEFAULT 'member',
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES users(id),
  accepted_by_user_id UUID NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, token_hash)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NULL,
  device_label TEXT NULL,
  device_fingerprint TEXT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  geo_country_code CHAR(2) NULL,
  status TEXT NOT NULL DEFAULT 'active',
  risk_score INTEGER NOT NULL DEFAULT 0,
  requires_step_up BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_satisfied_at TIMESTAMPTZ NULL,
  last_seen_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  revoked_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_active
  ON user_sessions (user_id, status, expires_at);

CREATE TABLE IF NOT EXISTS user_mfa_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  label TEXT NULL,
  secret_encrypted TEXT NULL,
  backup_code_hashes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  last_used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_mfa_primary_verified
  ON user_mfa_methods (user_id)
  WHERE (is_primary = TRUE AND is_verified = TRUE);

CREATE TABLE IF NOT EXISTS sso_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  issuer TEXT NULL,
  audience TEXT NULL,
  entry_point TEXT NULL,
  metadata_url TEXT NULL,
  client_id TEXT NULL,
  client_secret_ref TEXT NULL,
  scim_endpoint TEXT NULL,
  allow_jit_provisioning BOOLEAN NOT NULL DEFAULT FALSE,
  default_membership_role TEXT NOT NULL DEFAULT 'member',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, provider_name)
);

CREATE TABLE IF NOT EXISTS user_sso_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_id UUID NULL REFERENCES entities(id) ON DELETE SET NULL,
  connection_id UUID NULL REFERENCES sso_connections(id) ON DELETE SET NULL,
  provider_type TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  email TEXT NULL,
  scim_external_id TEXT NULL,
  attributes JSONB NULL,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_name, subject)
);

CREATE TABLE IF NOT EXISTS auth_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL REFERENCES users(id),
  entity_id UUID NULL REFERENCES entities(id),
  session_id UUID NULL REFERENCES user_sessions(id),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  ip_address TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_events_entity
  ON auth_audit_events (entity_id, event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ NULL,
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_pending
  ON outbox_events (status, available_at, event_name);
