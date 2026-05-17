ALTER TABLE entity_locations
  ADD COLUMN IF NOT EXISTS city_centroid_lat NUMERIC(9,6) NULL,
  ADD COLUMN IF NOT EXISTS city_centroid_lng NUMERIC(9,6) NULL,
  ADD COLUMN IF NOT EXISTS last_geocoded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS visibility_updated_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS consent_version TEXT NULL,
  ADD COLUMN IF NOT EXISTS privacy_warning_acknowledged_at TIMESTAMPTZ NULL;

CREATE TABLE IF NOT EXISTS location_disclosure_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES entity_locations(id) ON DELETE CASCADE,
  captured_by_user_id UUID NULL,
  visibility TEXT NOT NULL,
  legal_basis TEXT NOT NULL DEFAULT 'consent',
  policy_version TEXT NOT NULL DEFAULT 'location-v4.1',
  consent_text TEXT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_location_disclosure_consents_location
  ON location_disclosure_consents (location_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS location_geocode_review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES entity_locations(id) ON DELETE CASCADE,
  verification_request_id UUID NULL REFERENCES location_verification_requests(id) ON DELETE SET NULL,
  review_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  reason TEXT NULL,
  proposed_latitude NUMERIC(9,6) NULL,
  proposed_longitude NUMERIC(9,6) NULL,
  assigned_to_user_id UUID NULL,
  resolution_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_location_geocode_review_tasks_status
  ON location_geocode_review_tasks (status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_geocode_review_tasks_location
  ON location_geocode_review_tasks (location_id, status);

CREATE TABLE IF NOT EXISTS location_coverage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES entity_locations(id) ON DELETE CASCADE,
  coverage_type TEXT NOT NULL DEFAULT 'circle',
  geojson JSONB NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  superseded_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_coverage_snapshots_location
  ON location_coverage_snapshots (location_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS location_postal_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id UUID NOT NULL REFERENCES location_verification_requests(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'lob',
  provider_tracking_id TEXT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dispatched_at TIMESTAMPTZ NULL,
  expected_delivery_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_location_postal_dispatches_status
  ON location_postal_dispatches (status, requested_at DESC);
