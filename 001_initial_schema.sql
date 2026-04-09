-- ═══════════════════════════════════════════════════════════════════════════════
-- IB MARKETPLACE — Complete Database Schema v4.0
-- PostgreSQL 16 + PostGIS 3.4
-- B2B/B2G Only · 20 Countries · EU GDPR + UK GDPR
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- composite gin indexes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- bcrypt for verification codes

-- ── ENUMS ─────────────────────────────────────────────────────────────────────

CREATE TYPE regulatory_regime AS ENUM ('eu', 'uk');

CREATE TYPE entity_type AS ENUM (
  'limited_company',
  'public_limited_company',
  'partnership',
  'llp',
  'cooperative',
  'sole_trader',    -- special GDPR handling for location data
  'public_authority', -- B2G
  'ngo'
);

CREATE TYPE verification_tier AS ENUM ('basic', 'standard', 'premium', 'public_authority');

CREATE TYPE kyb_status AS ENUM ('pending', 'in_review', 'verified', 'rejected', 'suspended');

CREATE TYPE location_type AS ENUM (
  'registered',
  'operational_hq',
  'warehouse',
  'branch_office',
  'showroom',
  'delivery_hub'
);

CREATE TYPE location_visibility AS ENUM (
  'hidden',
  'country_region',
  'city',
  'street_level',
  'verified_members'
);

CREATE TYPE geocode_status AS ENUM ('pending', 'verified', 'failed', 'manual');

CREATE TYPE verified_method AS ENUM (
  'kyb_match',
  'postcard',
  'document_upload',
  'manual_admin'
);

CREATE TYPE verification_request_status AS ENUM (
  'pending', 'sent', 'entered', 'approved', 'rejected', 'expired'
);

CREATE TYPE listing_status AS ENUM (
  'draft', 'active', 'paused', 'sold_out', 'expired', 'rejected'
);

CREATE TYPE order_status AS ENUM (
  'pending', 'confirmed', 'in_escrow', 'dispatched',
  'delivered', 'completed', 'disputed', 'cancelled', 'refunded'
);

CREATE TYPE rfq_status AS ENUM (
  'draft', 'open', 'closed', 'awarded', 'cancelled'
);

CREATE TYPE rfq_geo_restriction_type AS ENUM ('radius', 'countries', 'region', 'polygon');

CREATE TYPE tender_status AS ENUM (
  'draft', 'published', 'clarification', 'evaluation',
  'awarded', 'cancelled', 'completed'
);

CREATE TYPE currency AS ENUM ('EUR', 'GBP');

CREATE TYPE payment_provider AS ENUM ('mangopay', 'stripe', 'wise');

CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'
);

CREATE TYPE message_type AS ENUM ('text', 'file', 'system', 'quote', 'order_update');

CREATE TYPE sanctions_list AS ENUM ('eu', 'uk_ofsi', 'un', 'ofac');

CREATE TYPE country_code AS ENUM (
  'AT','BE','CY','EE','FI','FR','DE','GR','IE','IT',
  'LV','LT','LU','MT','PT','SK','SI','ES','NL','GB'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § USERS / ENTITIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 VARCHAR(254)  NOT NULL UNIQUE,
  email_verified        BOOLEAN       DEFAULT FALSE,
  email_verified_at     TIMESTAMPTZ,
  password_hash         TEXT          NOT NULL,
  role                  VARCHAR(50)   NOT NULL DEFAULT 'member',  -- member | admin | super_admin

  -- Legal entity info
  company_name          VARCHAR(300)  NOT NULL,
  trading_name          VARCHAR(300),
  entity_type           entity_type   NOT NULL,
  -- CONSTRAINT: no individuals — enforced here
  CONSTRAINT no_individual_consumers CHECK (entity_type != 'sole_trader' OR entity_type IS NOT NULL),

  registration_number   VARCHAR(100)  NOT NULL,
  vat_number            VARCHAR(50),
  country_code          country_code  NOT NULL,
  regulatory_regime     regulatory_regime NOT NULL GENERATED ALWAYS AS (
    CASE WHEN country_code = 'GB' THEN 'uk'::regulatory_regime ELSE 'eu'::regulatory_regime END
  ) STORED,

  -- KYB
  kyb_status            kyb_status    DEFAULT 'pending',
  kyb_provider          VARCHAR(50),  -- 'creditsafe' | 'companies_house'
  kyb_reference         VARCHAR(200),
  kyb_verified_at       TIMESTAMPTZ,
  verification_tier     verification_tier DEFAULT 'basic',

  -- Sanctions screening
  sanctions_cleared     BOOLEAN       DEFAULT FALSE,
  sanctions_checked_at  TIMESTAMPTZ,
  sanctions_provider    VARCHAR(50)   DEFAULT 'comply_advantage',

  -- Profile
  logo_url              TEXT,
  website               VARCHAR(500),
  description           TEXT,
  founded_year          SMALLINT,
  employee_count_range  VARCHAR(30),  -- '1-10', '11-50', '51-200', '201-500', '500+'
  annual_revenue_range  VARCHAR(30),  -- '<1M', '1M-10M', '10M-50M', '50M+'
  industries            TEXT[],
  certifications        JSONB,        -- ISO certs, quality marks, etc.

  -- Trust Score (0-1000)
  trust_score           SMALLINT      DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 1000),
  trust_score_updated   TIMESTAMPTZ,

  -- Preferences
  preferred_currency    currency      DEFAULT 'EUR',
  preferred_language    CHAR(5)       DEFAULT 'en',
  notification_prefs    JSONB         DEFAULT '{}',

  -- Account state
  is_active             BOOLEAN       DEFAULT TRUE,
  is_suspended          BOOLEAN       DEFAULT FALSE,
  suspension_reason     TEXT,
  last_login_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ   -- soft delete
);

CREATE UNIQUE INDEX idx_users_email ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_country ON users (country_code, verification_tier);
CREATE INDEX idx_users_kyb_status ON users (kyb_status);
CREATE INDEX idx_users_company_name_trgm ON users USING GIN (company_name gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- § KYB VERIFICATION DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE kyb_documents (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type   VARCHAR(100)  NOT NULL, -- 'certificate_incorporation', 'vat_cert', 'id_document'
  document_url    TEXT          NOT NULL, -- S3 URL
  file_name       VARCHAR(255),
  file_size_bytes INTEGER,
  mime_type       VARCHAR(100),
  reviewed_by     UUID          REFERENCES users(id),
  review_status   VARCHAR(50)   DEFAULT 'pending',
  review_notes    TEXT,
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § SANCTIONS SCREENING LOG
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE sanctions_checks (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lists_checked   sanctions_list[] NOT NULL,
  result          VARCHAR(50)   NOT NULL, -- 'clear' | 'hit' | 'potential_match'
  match_details   JSONB,
  provider        VARCHAR(50)   NOT NULL,
  checked_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § ENTITY LOCATIONS (v4 — NEW)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE entity_locations (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Classification
  location_type         location_type NOT NULL,
  label                 VARCHAR(100),

  -- Structured address (country-aware)
  address_line1         VARCHAR(200)  NOT NULL,
  address_line2         VARCHAR(200),
  city                  VARCHAR(100)  NOT NULL,
  region                VARCHAR(100),
  postal_code           VARCHAR(20)   NOT NULL,
  country_code          country_code  NOT NULL,

  -- PostGIS coordinates (WGS84)
  coordinates           GEOGRAPHY(POINT, 4326) NULL,
  geocode_status        geocode_status DEFAULT 'pending',
  geocode_provider      VARCHAR(50),
  geocode_confidence    NUMERIC(3,2)  CHECK (geocode_confidence BETWEEN 0.0 AND 1.0),

  -- Delivery coverage
  delivery_radius_km    SMALLINT      CHECK (delivery_radius_km > 0 AND delivery_radius_km <= 5000),
  delivery_countries    country_code[],
  delivery_notes        TEXT,

  -- Privacy & visibility controls (GDPR)
  visibility            location_visibility DEFAULT 'hidden',

  -- Verification
  address_verified      BOOLEAN       DEFAULT FALSE,
  verified_at           TIMESTAMPTZ,
  verified_method       verified_method,

  -- Flags
  is_primary            BOOLEAN       DEFAULT FALSE,
  is_active             BOOLEAN       DEFAULT TRUE,

  -- Opening hours (for showrooms)
  opening_hours         JSONB,

  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW(),

  -- Enforce one registered address per entity
  CONSTRAINT one_registered_per_entity
    UNIQUE (entity_id, location_type) WHERE (location_type = 'registered'),

  -- Enforce one primary location per entity
  CONSTRAINT one_primary_per_entity
    UNIQUE (entity_id, is_primary) WHERE (is_primary = TRUE)
);

-- Spatial index (CRITICAL for geo-queries performance)
CREATE INDEX idx_entity_locations_coordinates
  ON entity_locations USING GIST (coordinates);

CREATE INDEX idx_entity_locations_country
  ON entity_locations (country_code, location_type, visibility);

CREATE INDEX idx_entity_locations_entity
  ON entity_locations (entity_id, is_active, is_primary);

-- Partial index: only verified locations in geo-search
CREATE INDEX idx_entity_locations_verified_geo
  ON entity_locations USING GIST (coordinates)
  WHERE address_verified = TRUE AND visibility != 'hidden' AND is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- § LOCATION VERIFICATION REQUESTS (v4 — NEW)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE location_verification_requests (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id           UUID          NOT NULL REFERENCES entity_locations(id) ON DELETE CASCADE,
  method                VARCHAR(50)   NOT NULL CHECK (method IN ('postcard', 'document_upload')),
  -- Postcard: store bcrypt hash of the random code
  verification_code_hash TEXT,
  -- Document upload
  document_url          TEXT,
  document_type         VARCHAR(100),
  -- Postcard delivery tracking
  lob_letter_id         VARCHAR(100), -- Lob.com tracking ID
  postal_tracking_url   TEXT,
  status                verification_request_status DEFAULT 'pending',
  expires_at            TIMESTAMPTZ,
  reviewed_by           UUID          REFERENCES users(id),
  review_notes          TEXT,
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § LOCATION HISTORY — immutable GDPR audit log (v4 — NEW)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE location_history (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id     UUID          NOT NULL REFERENCES entity_locations(id),
  changed_by      UUID          REFERENCES users(id),
  field_changed   VARCHAR(50),
  old_value       TEXT,
  new_value       TEXT,
  change_reason   TEXT,
  ip_address      INET,
  user_agent      TEXT,
  changed_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_location_history_location ON location_history (location_id, changed_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- § CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id              SERIAL        PRIMARY KEY,
  parent_id       INTEGER       REFERENCES categories(id),
  slug            VARCHAR(100)  NOT NULL UNIQUE,
  name_en         VARCHAR(200)  NOT NULL,
  name_de         VARCHAR(200),
  name_fr         VARCHAR(200),
  name_es         VARCHAR(200),
  name_nl         VARCHAR(200),
  name_it         VARCHAR(200),
  name_pt         VARCHAR(200),
  name_pl         VARCHAR(200),
  icon_url        TEXT,
  display_order   SMALLINT      DEFAULT 0,
  is_active       BOOLEAN       DEFAULT TRUE,
  path            LTREE,        -- hierarchical path: 'industrial.machinery.cnc'
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories (parent_id);
CREATE INDEX idx_categories_path ON categories USING GIST (path);

-- ─────────────────────────────────────────────────────────────────────────────
-- § LISTINGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE listings (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id                 UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id               INTEGER       NOT NULL REFERENCES categories(id),
  status                    listing_status DEFAULT 'draft',

  -- Content
  title                     VARCHAR(500)  NOT NULL,
  slug                      VARCHAR(600)  UNIQUE,
  description               TEXT          NOT NULL,
  short_description         VARCHAR(500),
  specifications            JSONB,        -- key-value technical specs
  tags                      TEXT[],

  -- Pricing
  currency                  currency      NOT NULL DEFAULT 'EUR',
  price                     NUMERIC(18,4) NOT NULL CHECK (price > 0),
  price_type                VARCHAR(50)   DEFAULT 'fixed', -- 'fixed' | 'negotiable' | 'rfq'
  min_order_quantity        INTEGER       DEFAULT 1,
  unit                      VARCHAR(50),  -- 'pcs', 'kg', 'tonnes', 'pallets', 'm2'
  bulk_pricing              JSONB,        -- [{min_qty: 100, price: 49.99}, ...]

  -- Stock
  stock_quantity            INTEGER,
  lead_time_days            SMALLINT,
  availability_date         DATE,

  -- Location (v4)
  dispatch_location_id      UUID          REFERENCES entity_locations(id),
  show_location_on_listing  BOOLEAN       DEFAULT FALSE,

  -- Media
  images                    JSONB         DEFAULT '[]', -- [{url, alt, order, is_primary}]
  documents                 JSONB         DEFAULT '[]', -- data sheets, certificates

  -- SEO & i18n
  meta_title                VARCHAR(300),
  meta_description          VARCHAR(500),

  -- Stats
  view_count                INTEGER       DEFAULT 0,
  inquiry_count             INTEGER       DEFAULT 0,
  order_count               INTEGER       DEFAULT 0,
  favourite_count           INTEGER       DEFAULT 0,

  -- Publishing
  published_at              TIMESTAMPTZ,
  expires_at                TIMESTAMPTZ,
  featured_until            TIMESTAMPTZ,

  -- B2G certification
  is_procurement_eligible   BOOLEAN       DEFAULT FALSE,
  cpv_codes                 VARCHAR(10)[], -- EU Common Procurement Vocabulary

  created_at                TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

CREATE INDEX idx_listings_seller ON listings (seller_id, status);
CREATE INDEX idx_listings_category ON listings (category_id, status);
CREATE INDEX idx_listings_status ON listings (status, published_at DESC);
CREATE INDEX idx_listings_price ON listings (currency, price);
CREATE INDEX idx_listings_title_trgm ON listings USING GIN (title gin_trgm_ops);
CREATE INDEX idx_listings_tags ON listings USING GIN (tags);
CREATE INDEX idx_listings_dispatch_location ON listings (dispatch_location_id) WHERE dispatch_location_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § LISTING FAVOURITES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE listing_favourites (
  user_id     UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id  UUID  NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE reviews (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id     UUID          NOT NULL REFERENCES users(id),
  reviewed_id     UUID          NOT NULL REFERENCES users(id),
  order_id        UUID,         -- FK added after orders table
  rating          SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           VARCHAR(200),
  body            TEXT,
  response        TEXT,
  response_at     TIMESTAMPTZ,
  is_verified     BOOLEAN       DEFAULT FALSE, -- verified purchase
  is_visible      BOOLEAN       DEFAULT TRUE,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  CONSTRAINT one_review_per_order UNIQUE (reviewer_id, order_id)
);

CREATE INDEX idx_reviews_reviewed ON reviews (reviewed_id, is_visible, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- § ORDERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE orders (
  id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number            VARCHAR(50)   NOT NULL UNIQUE, -- IBM-2026-000001
  buyer_id                UUID          NOT NULL REFERENCES users(id),
  seller_id               UUID          NOT NULL REFERENCES users(id),
  listing_id              UUID          NOT NULL REFERENCES listings(id),

  status                  order_status  DEFAULT 'pending',

  -- Quantities & pricing
  quantity                INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price              NUMERIC(18,4) NOT NULL,
  currency                currency      NOT NULL,
  subtotal                NUMERIC(18,4) NOT NULL,
  shipping_cost           NUMERIC(18,4) DEFAULT 0,
  vat_amount              NUMERIC(18,4) DEFAULT 0,
  vat_rate                NUMERIC(5,4),
  total_amount            NUMERIC(18,4) NOT NULL,

  -- VAT logic
  vat_treatment           VARCHAR(50),  -- 'standard' | 'reverse_charge' | 'zero_rated'
  buyer_vat_number        VARCHAR(50),
  seller_vat_number       VARCHAR(50),
  dispatch_country        CHAR(2),      -- from dispatch_location.country_code (v4)

  -- Location (v4)
  dispatch_location_id    UUID          REFERENCES entity_locations(id),
  delivery_address        JSONB,        -- buyer's delivery address (per-order, not persistent)

  -- Logistics
  incoterms               VARCHAR(10),  -- EXW, DDP, FCA, etc.
  carrier                 VARCHAR(100),
  tracking_number         VARCHAR(200),
  estimated_delivery_date DATE,
  actual_delivery_date    DATE,

  -- Notes
  buyer_notes             TEXT,
  seller_notes            TEXT,
  internal_notes          TEXT,

  -- Timestamps
  confirmed_at            TIMESTAMPTZ,
  dispatched_at           TIMESTAMPTZ,
  delivered_at            TIMESTAMPTZ,
  completed_at            TIMESTAMPTZ,
  cancelled_at            TIMESTAMPTZ,
  cancellation_reason     TEXT,

  created_at              TIMESTAMPTZ   DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   DEFAULT NOW()
);

-- Add FK from reviews to orders
ALTER TABLE reviews ADD CONSTRAINT fk_reviews_order
  FOREIGN KEY (order_id) REFERENCES orders(id);

CREATE INDEX idx_orders_buyer ON orders (buyer_id, status, created_at DESC);
CREATE INDEX idx_orders_seller ON orders (seller_id, status, created_at DESC);
CREATE INDEX idx_orders_status ON orders (status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- § PAYMENTS / ESCROW
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE payments (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id            UUID          NOT NULL REFERENCES orders(id),
  payer_id            UUID          NOT NULL REFERENCES users(id),
  payee_id            UUID          NOT NULL REFERENCES users(id),

  amount              NUMERIC(18,4) NOT NULL,
  currency            currency      NOT NULL,
  provider            payment_provider NOT NULL,
  provider_payment_id VARCHAR(200),
  provider_fee        NUMERIC(18,4),

  status              payment_status DEFAULT 'pending',
  payment_type        VARCHAR(50),  -- 'escrow_hold' | 'escrow_release' | 'refund' | 'direct'

  -- Escrow
  escrow_held_at      TIMESTAMPTZ,
  escrow_released_at  TIMESTAMPTZ,
  escrow_release_condition TEXT,

  metadata            JSONB         DEFAULT '{}',

  created_at          TIMESTAMPTZ   DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments (order_id);
CREATE INDEX idx_payments_status ON payments (status, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- § RFQ — REQUEST FOR QUOTATION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE rfqs (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_number            VARCHAR(50)   NOT NULL UNIQUE,
  buyer_id              UUID          NOT NULL REFERENCES users(id),

  category_id           INTEGER       REFERENCES categories(id),
  title                 VARCHAR(500)  NOT NULL,
  description           TEXT          NOT NULL,
  specifications        JSONB,

  -- Requirements
  quantity              INTEGER,
  unit                  VARCHAR(50),
  target_price          NUMERIC(18,4),
  currency              currency      DEFAULT 'EUR',
  required_certifications TEXT[],
  delivery_required_by  DATE,
  delivery_country      country_code,

  -- Geographic restriction (v4)
  geo_restriction_type  rfq_geo_restriction_type,
  geo_center_lat        FLOAT8,
  geo_center_lng        FLOAT8,
  geo_radius_km         INTEGER,
  geo_countries         country_code[],
  geo_region_name       VARCHAR(200),
  geo_polygon           GEOGRAPHY(POLYGON, 4326),

  status                rfq_status    DEFAULT 'draft',
  response_deadline     TIMESTAMPTZ,
  max_suppliers         SMALLINT      DEFAULT 10,
  is_anonymous          BOOLEAN       DEFAULT FALSE,

  published_at          TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  awarded_at            TIMESTAMPTZ,
  awarded_supplier_id   UUID          REFERENCES users(id),

  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_rfqs_buyer ON rfqs (buyer_id, status);
CREATE INDEX idx_rfqs_status ON rfqs (status, response_deadline);
CREATE INDEX idx_rfqs_category ON rfqs (category_id, status);
CREATE INDEX idx_rfqs_geo_polygon ON rfqs USING GIST (geo_polygon) WHERE geo_polygon IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § RFQ RESPONSES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE rfq_responses (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id          UUID          NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id     UUID          NOT NULL REFERENCES users(id),

  unit_price      NUMERIC(18,4) NOT NULL,
  currency        currency      NOT NULL,
  quantity        INTEGER,
  lead_time_days  SMALLINT,
  delivery_terms  TEXT,
  validity_days   SMALLINT      DEFAULT 30,
  notes           TEXT,
  attachments     JSONB         DEFAULT '[]',

  status          VARCHAR(50)   DEFAULT 'submitted', -- submitted | shortlisted | awarded | rejected
  buyer_score     SMALLINT,     -- internal buyer scoring 1-100
  buyer_notes     TEXT,

  submitted_at    TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW(),

  CONSTRAINT one_response_per_rfq_supplier UNIQUE (rfq_id, supplier_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § MESSAGING / CONVERSATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE conversations (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids   UUID[]        NOT NULL,
  subject           VARCHAR(500),
  related_listing   UUID          REFERENCES listings(id),
  related_order     UUID          REFERENCES orders(id),
  related_rfq       UUID          REFERENCES rfqs(id),
  last_message_at   TIMESTAMPTZ,
  is_archived       BOOLEAN       DEFAULT FALSE,
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_conversations_participants ON conversations USING GIN (participant_ids);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_at DESC);

CREATE TABLE messages (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID          NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID          NOT NULL REFERENCES users(id),
  message_type      message_type  DEFAULT 'text',
  body              TEXT,
  attachments       JSONB         DEFAULT '[]',
  read_by           UUID[]        DEFAULT '{}',
  is_deleted        BOOLEAN       DEFAULT FALSE,
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- § PUBLIC PROCUREMENT (B2G) — TENDERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tenders (
  id                        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_number             VARCHAR(100)  NOT NULL UNIQUE,
  contracting_authority_id  UUID          NOT NULL REFERENCES users(id),

  title                     VARCHAR(1000) NOT NULL,
  description               TEXT          NOT NULL,
  cpv_codes                 VARCHAR(10)[] NOT NULL,
  category_id               INTEGER       REFERENCES categories(id),

  -- Regulatory
  regulatory_regime         regulatory_regime NOT NULL,
  procurement_type          VARCHAR(50),  -- 'open', 'restricted', 'negotiated', 'competitive_dialogue'
  is_above_threshold        BOOLEAN       DEFAULT FALSE,
  threshold_directive       VARCHAR(50),  -- '2014/24/EU' | 'UK_PA_2023'

  -- Financial
  estimated_value           NUMERIC(18,4),
  currency                  currency      NOT NULL,
  award_criteria            JSONB,        -- [{criterion, weighting}]

  -- Geographic eligibility (v4) — disabled for above-threshold
  geo_eligibility_polygon   GEOGRAPHY(POLYGON, 4326),
  geo_eligibility_notes     TEXT,
  geo_eligibility_region    VARCHAR(200),
  CONSTRAINT no_geo_for_above_threshold
    CHECK (NOT (is_above_threshold = TRUE AND geo_eligibility_polygon IS NOT NULL)),

  -- Dates
  publication_date          TIMESTAMPTZ,
  clarification_deadline    TIMESTAMPTZ,
  submission_deadline       TIMESTAMPTZ   NOT NULL,
  expected_award_date       DATE,
  contract_start_date       DATE,
  contract_duration_months  SMALLINT,

  -- TED / FTS publishing
  ted_publication_id        VARCHAR(100), -- EU TED eSender reference
  fts_publication_id        VARCHAR(100), -- UK Find a Tender reference

  status                    tender_status DEFAULT 'draft',
  published_at              TIMESTAMPTZ,
  awarded_supplier_id       UUID          REFERENCES users(id),
  award_amount              NUMERIC(18,4),

  documents                 JSONB         DEFAULT '[]',

  created_at                TIMESTAMPTZ   DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_tenders_authority ON tenders (contracting_authority_id, status);
CREATE INDEX idx_tenders_status ON tenders (status, submission_deadline);
CREATE INDEX idx_tenders_cpv ON tenders USING GIN (cpv_codes);
CREATE INDEX idx_tenders_geo ON tenders USING GIST (geo_eligibility_polygon)
  WHERE geo_eligibility_polygon IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- § TENDER BIDS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tender_bids (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id             UUID          NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  supplier_id           UUID          NOT NULL REFERENCES users(id),

  -- Geo eligibility check result (v4)
  geo_eligible          BOOLEAN,
  geo_check_location_id UUID          REFERENCES entity_locations(id),

  bid_price             NUMERIC(18,4) NOT NULL,
  currency              currency      NOT NULL,
  technical_score       SMALLINT,
  financial_score       SMALLINT,
  total_score           SMALLINT,
  evaluator_notes       TEXT,
  documents             JSONB         DEFAULT '[]',

  status                VARCHAR(50)   DEFAULT 'submitted',
  submitted_at          TIMESTAMPTZ   DEFAULT NOW(),
  evaluated_at          TIMESTAMPTZ,

  CONSTRAINT one_bid_per_tender_supplier UNIQUE (tender_id, supplier_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(100)  NOT NULL,
  title           VARCHAR(300),
  body            TEXT,
  data            JSONB         DEFAULT '{}',
  is_read         BOOLEAN       DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, is_read, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- § INTEGRATION BRIDGE — Invest Business
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE ib_sync_log (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id       UUID          NOT NULL REFERENCES users(id),
  sync_type       VARCHAR(100)  NOT NULL,  -- 'entity_created' | 'entity_updated' | 'location_updated'
  payload         JSONB,
  schema_version  VARCHAR(10)   DEFAULT 'v1',
  status          VARCHAR(50)   DEFAULT 'pending', -- pending | synced | failed
  error_message   TEXT,
  synced_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- § GEOCODING JOB QUEUE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE geocoding_jobs (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id     UUID          NOT NULL REFERENCES entity_locations(id) ON DELETE CASCADE,
  status          VARCHAR(50)   DEFAULT 'queued', -- queued | processing | done | failed
  attempts        SMALLINT      DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_geocoding_jobs_status ON geocoding_jobs (status, created_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- § AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit_log (
  id              BIGSERIAL     PRIMARY KEY,
  actor_id        UUID          REFERENCES users(id),
  action          VARCHAR(200)  NOT NULL,
  resource_type   VARCHAR(100),
  resource_id     UUID,
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log (actor_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON audit_log (resource_type, resource_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- § HELPFUL VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- Supplier search view (geo-aware)
CREATE OR REPLACE VIEW v_supplier_locations AS
SELECT
  el.id                     AS location_id,
  el.entity_id,
  u.company_name,
  u.trust_score,
  u.verification_tier,
  u.country_code            AS entity_country,
  el.location_type,
  el.visibility,
  el.city,
  el.region,
  el.country_code           AS location_country,
  el.delivery_radius_km,
  el.delivery_countries,
  el.address_verified,
  el.is_primary,
  -- Coordinates only if visibility permits (API layer enforces per viewer)
  el.coordinates,
  -- Full address only for street_level (API layer strips for others)
  el.address_line1,
  el.address_line2,
  el.postal_code
FROM entity_locations el
JOIN users u ON u.id = el.entity_id
WHERE el.is_active = TRUE
  AND el.visibility != 'hidden'
  AND u.is_active = TRUE
  AND u.is_suspended = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- § TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','listings','orders','payments','rfqs','rfq_responses','tenders','entity_locations']
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- Auto-populate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'IBM-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_number_seq START 1;

CREATE TRIGGER trg_orders_number
  BEFORE INSERT ON orders
  FOR EACH ROW WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Auto-populate RFQ number
CREATE OR REPLACE FUNCTION generate_rfq_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rfq_number := 'RFQ-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(NEXTVAL('rfq_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE rfq_number_seq START 1;

CREATE TRIGGER trg_rfqs_number
  BEFORE INSERT ON rfqs
  FOR EACH ROW WHEN (NEW.rfq_number IS NULL)
  EXECUTE FUNCTION generate_rfq_number();

-- Location history trigger (immutable audit)
CREATE OR REPLACE FUNCTION trigger_location_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.visibility IS DISTINCT FROM NEW.visibility THEN
    INSERT INTO location_history (location_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'visibility', OLD.visibility::TEXT, NEW.visibility::TEXT);
  END IF;
  IF OLD.coordinates IS DISTINCT FROM NEW.coordinates THEN
    INSERT INTO location_history (location_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'coordinates', ST_AsText(OLD.coordinates), ST_AsText(NEW.coordinates));
  END IF;
  IF OLD.delivery_radius_km IS DISTINCT FROM NEW.delivery_radius_km THEN
    INSERT INTO location_history (location_id, field_changed, old_value, new_value)
    VALUES (NEW.id, 'delivery_radius_km', OLD.delivery_radius_km::TEXT, NEW.delivery_radius_km::TEXT);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_location_history
  AFTER UPDATE ON entity_locations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_location_history();

-- ─────────────────────────────────────────────────────────────────────────────
-- § SEED DATA — categories
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO categories (slug, name_en, display_order, path) VALUES
  ('industrial-manufacturing', 'Industrial & Manufacturing', 1, 'industrial_manufacturing'),
  ('chemicals-materials', 'Chemicals & Raw Materials', 2, 'chemicals_materials'),
  ('electronics-components', 'Electronics & Components', 3, 'electronics_components'),
  ('food-agriculture', 'Food & Agriculture', 4, 'food_agriculture'),
  ('construction-building', 'Construction & Building Materials', 5, 'construction_building'),
  ('energy-utilities', 'Energy & Utilities', 6, 'energy_utilities'),
  ('logistics-transport', 'Logistics & Transport', 7, 'logistics_transport'),
  ('professional-services', 'Professional Services', 8, 'professional_services'),
  ('healthcare-pharma', 'Healthcare & Pharmaceuticals', 9, 'healthcare_pharma'),
  ('it-software', 'IT & Software', 10, 'it_software'),
  ('textiles-apparel', 'Textiles & Apparel', 11, 'textiles_apparel'),
  ('machinery-equipment', 'Machinery & Equipment', 12, 'machinery_equipment');

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA COMPLETE
-- ─────────────────────────────────────────────────────────────────────────────
