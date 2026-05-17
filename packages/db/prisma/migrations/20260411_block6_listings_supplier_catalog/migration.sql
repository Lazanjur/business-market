-- Block 6: listings and supplier catalog

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS category_path TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS publication_status VARCHAR(50) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS storefront_visibility VARCHAR(50) NOT NULL DEFAULT 'members_only',
  ADD COLUMN IF NOT EXISTS moq_unit VARCHAR(40),
  ADD COLUMN IF NOT EXISTS packaging_unit VARCHAR(60),
  ADD COLUMN IF NOT EXISTS lead_time_days_min INTEGER,
  ADD COLUMN IF NOT EXISTS lead_time_days_max INTEGER,
  ADD COLUMN IF NOT EXISTS stock_status VARCHAR(50) NOT NULL DEFAULT 'made_to_order',
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS incoterms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS seo_title VARCHAR(220),
  ADD COLUMN IF NOT EXISTS seo_summary TEXT,
  ADD COLUMN IF NOT EXISTS search_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS capability_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS compliance_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS origin_country_code CHAR(2),
  ADD COLUMN IF NOT EXISTS attribute_schema_version VARCHAR(50) DEFAULT 'catalog-v1',
  ADD COLUMN IF NOT EXISTS quality_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS supplier_catalog_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  description TEXT,
  storefront_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_catalog_collections_entity_slug_unique UNIQUE (entity_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_supplier_catalog_collections_entity_order
  ON supplier_catalog_collections (entity_id, storefront_order);

CREATE TABLE IF NOT EXISTS supplier_catalog_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES supplier_catalog_collections(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT supplier_catalog_collection_items_unique UNIQUE (collection_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_catalog_collection_items_order
  ON supplier_catalog_collection_items (collection_id, sort_order);
