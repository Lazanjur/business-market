CREATE TABLE IF NOT EXISTS entity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL UNIQUE REFERENCES entities(id) ON DELETE CASCADE,
  display_name TEXT NULL,
  tagline TEXT NULL,
  description TEXT NULL,
  website_url TEXT NULL,
  support_email TEXT NULL,
  sales_email TEXT NULL,
  phone_number TEXT NULL,
  year_founded INTEGER NULL,
  employee_range TEXT NULL,
  annual_revenue_band TEXT NULL,
  legal_form TEXT NULL,
  procurement_readiness TEXT NOT NULL DEFAULT 'not_assessed',
  profile_visibility TEXT NOT NULL DEFAULT 'members_only',
  coverage_countries CHAR(2)[] NOT NULL DEFAULT ARRAY[]::CHAR(2)[],
  supported_languages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  capabilities JSONB NULL,
  seo_summary TEXT NULL,
  profile_status TEXT NOT NULL DEFAULT 'draft',
  completeness_score INTEGER NOT NULL DEFAULT 0,
  insurance_status TEXT NULL,
  insurance_expires_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entity_authority_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL UNIQUE REFERENCES entities(id) ON DELETE CASCADE,
  authority_code TEXT NULL,
  authority_level TEXT NULL,
  procurement_scope TEXT NULL,
  region_name TEXT NULL,
  budget_band TEXT NULL,
  notice_publishing_endpoint TEXT NULL,
  policy_url TEXT NULL,
  is_utilities_entity BOOLEAN NOT NULL DEFAULT FALSE,
  is_framework_buyer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  parent_id UUID NULL REFERENCES organization_units(id) ON DELETE SET NULL,
  unit_type TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NULL,
  slug TEXT NOT NULL,
  description TEXT NULL,
  country_code CHAR(2) NULL,
  region TEXT NULL,
  city TEXT NULL,
  cost_center TEXT NULL,
  budget_owner TEXT NULL,
  is_procurement_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_organization_units_lookup
  ON organization_units (entity_id, unit_type, is_active);

CREATE TABLE IF NOT EXISTS entity_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID NULL REFERENCES organization_units(id) ON DELETE SET NULL,
  membership_role TEXT NOT NULL DEFAULT 'member',
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
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

CREATE TABLE IF NOT EXISTS entity_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL,
  issuing_body TEXT NULL,
  reference_number TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  document_url TEXT NULL,
  scope JSONB NULL,
  verified_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_certifications_lookup
  ON entity_certifications (entity_id, certification_type, status);

CREATE TABLE IF NOT EXISTS trust_score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  reason TEXT NOT NULL,
  delta INTEGER NOT NULL,
  score_before INTEGER NOT NULL,
  score_after INTEGER NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_score_events_entity
  ON trust_score_events (entity_id, created_at DESC);
