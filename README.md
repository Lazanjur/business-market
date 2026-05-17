# IB Marketplace v4 Monorepo

Production-grade monorepo for a verified-only European **B2B/B2G marketplace** with:

- dual regulatory regime support (`eu` / `uk`)
- KYB/KYC/sanctions orchestration for verified legal entities
- multi-location supplier profiles with **PostGIS geo-search**
- procurement workflows and geo-eligible tenders
- cross-border listing / order / dispatch logic
- enterprise real-time messaging
- **multi-model AI chat orchestration** for buyer-seller and procurement assistance
- integration bridge for future Invest Business sync

This repo is intentionally structured as an extensible **platform**, not a demo landing page.

## Monorepo layout

```text
apps/
  api/         NestJS API gateway + domain modules
  web/         Next.js App Router portal UI
  worker/      Event-driven workers for governance, compliance, and indexing
packages/
  db/          Prisma schema, migrations, seed scripts
  shared/      Shared contracts, policy helpers, provider simulators
infra/
  opensearch/  Search index template
```

## Block status

### Block 1 — Platform foundation
- global config, Prisma, domain events, health-ready NestJS composition
- outbox-oriented worker pattern and shared runtime structure

### Block 2 — Auth and access control
- entity-only registration path
- JWT access + refresh lifecycle scaffolding
- MFA and access-matrix policy helpers
- invitation, SSO, and session-risk worker hooks

### Block 3 — Entity and organization management
- organization profiles, authority profiles, units, memberships
- certifications and trust-score recalculation
- governance workspace UI and supporting workers

### Block 4 — KYB/KYC/compliance orchestration
- compliance overview API with cases, checks, beneficial owners, evidence, and screening matches
- provider routing for Creditsafe, Companies House, Onfido/manual identity, and ComplyAdvantage/manual screening
- worker-side KYB refresh, sanctions screening, and document pre-review flows
- compliance workspace UI and admin review queue UI
- seed data, migration, policy tests, and operational/compliance docs

### Block 5 — Location and geo-privacy engine
- supplier multi-location management with visibility tiers and consent history
- delivery-coverage snapshots, postcard/document verification, and geocode-review queue
- privacy-aware nearby search, viewport clustering, and supplier footprint responses
- admin review tooling, privacy policy tests, and geo-privacy operational docs

### Block 6 — Listings and supplier catalog
- structured supplier catalog with storefront, category taxonomy, media, variants, and price tiers
- seller catalog workspace plus marketplace listing-detail and storefront pages
- publish gate using merchandising quality score and price-tier validation
- listing/workflow events for catalog indexing and storefront sync workers
- migration, seed enhancements, policy tests, and catalog governance docs

### Block 6 — Listings and supplier catalog
- structured supplier catalog with categories, storefronts, variants, price tiers, evidence documents, and curated sections
- dedicated listings API module for drafting, publishing, archiving, and buyer-facing catalog retrieval
- publication gating tied to verified-entity status, dispatch-location trust, documentary support, and searchable metadata
- worker-side catalog asset review and listing search projection preparation
- supplier catalog workspace UI, listing editor preview, storefront demo, migration, tests, and compliance docs

## Core capabilities implemented

### Marketplace
- verified entity model
- structured listings with `dispatchLocationId`, price tiers, variants, documents, and storefront visibility
- supplier storefronts and curated catalog sections
- order model carrying `deliveryAddress` JSON and dispatch origin
- supplier discovery by radius, map viewport, and country

### Location v4
- `entity_locations`, `location_verification_requests`, `location_history`
- privacy tiers from hidden to street-level / verified-members
- sole trader privacy hardening
- disclosure-consent audit trail and withdrawal records
- geocoding worker (Google primary, HERE fallback)
- manual geocode review queue for low-confidence addresses
- postcard dispatch tracking for physical address verification
- delivery-radius GeoJSON generation and coverage snapshots
- dual enforcement for visibility filtering

### Compliance orchestration
- `compliance_cases`, `compliance_checks`, `beneficial_owners`, `compliance_documents`
- `compliance_screening_matches`, `compliance_case_events`
- derived risk banding and review-priority logic
- manual review queues for KYB mismatches, screening hits, and document exceptions
- reverification hooks and provider simulators for local development

### Procurement
- RFQ creation with geographic restrictions
- tender creation with geographic eligibility polygons
- server-side validation to prevent geographic filters on the wrong threshold band

### KYB / KYC / Compliance
- provider-routed compliance cases (Creditsafe, Companies House, Onfido, ComplyAdvantage)
- beneficial-owner register and evidence workflow
- sanctions-hit review queue and reverification scheduling

### Chat and AI
- conversation, participants, messages, AI usage records
- websocket gateway for enterprise messaging
- provider-agnostic LLM adapter layer

## Quick start

### 1) Start infrastructure

```bash
docker compose up -d
```

### 2) Install dependencies

```bash
npm install
```

### 3) Generate Prisma client and apply migrations

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4) Run API + web + worker

```bash
npm run dev:api
npm run dev:web
npm run dev:worker
```

The portal starts on `http://localhost:3000` and the API on `http://localhost:4000`.

## Environment

Copy `.env.example` to `.env` and fill the required keys. The codebase is written to degrade safely when third-party providers are not yet configured.

## Design notes

- The **location privacy policy** is enforced in both the query layer and the response serializer.
- `dispatchLocationId` drives VAT supply-origin and logistics context.
- Compliance orchestration is intentionally case-based so onboarding, refresh, sanctions escalation, and public-authority verification can share one review queue.
- Shared provider simulators let developers exercise the workflow locally before real Creditsafe, Companies House, Onfido, and ComplyAdvantage credentials are connected.

## Next expansion points

1. add payment orchestration adapters (Mangopay EU, Stripe UK, Wise FX)
2. connect live KYB/KYC/sanctions providers behind the existing worker hooks
3. expand procurement workflow automation and scoring
4. add mobile app on the same shared contracts package


## Block docs

- Block 5: `docs/blocks/block-5-location-geo-privacy-engine.md`
- Block 6: `docs/blocks/block-6-listings-supplier-catalog.md`
- Compliance controls: `docs/compliance/location-geo-privacy-controls.md`
- Catalog controls: `docs/compliance/listings-catalog-controls.md`
- Test matrix: `docs/testing/block-5-location-test-matrix.md`
- Catalog test matrix: `docs/testing/block-6-listings-test-matrix.md`
