# IB Marketplace — Technical Specification v4.0

> **European B2B & B2G Commerce Platform**  
> 20 Countries · KYB-Verified · Location-Aware · EU GDPR + UK GDPR Compliant

---

## Architecture Overview

```
ib-marketplace/
├── apps/
│   ├── api/                 # NestJS API (Node.js/TypeScript)
│   └── web/                 # Next.js 14 Frontend (TypeScript)
├── packages/
│   ├── shared/              # Shared types, DTOs, constants
│   └── ui/                  # Shared UI component library
└── infrastructure/
    ├── docker/              # Docker Compose for all services
    ├── migrations/          # PostgreSQL migration files
    └── nginx/               # Reverse proxy config
```

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Mobile | React Native + Mapbox React Native SDK |
| API | NestJS + TypeScript (modular architecture) |
| Primary DB | PostgreSQL 16 + **PostGIS 3.4** |
| Search | Elasticsearch 8.x (geo_point indexing) |
| Cache | Redis 7 |
| Queue | RabbitMQ 3.12 |
| Storage | MinIO (dev) / AWS S3 (prod) |
| Geocoding | Google Maps API (primary) + HERE Maps (fallback) |
| Maps | **Mapbox GL JS** |
| Postcard | Lob.com (20 countries) |
| KYB | Creditsafe (EU) + Companies House (UK) |
| Payments | Mangopay (EU) + Stripe (UK/Global) |

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- PostgreSQL client (for migrations)

### 1. Clone and configure

```bash
git clone <repo>
cd ib-marketplace
cp .env.example .env.local
# Edit .env.local with your API keys
```

### 2. Start infrastructure

```bash
npm run docker:up
# Starts: PostgreSQL+PostGIS, Redis, Elasticsearch, RabbitMQ, MinIO
```

### 3. Run migrations

```bash
psql $DATABASE_URL -f infrastructure/migrations/001_initial_schema.sql
```

### 4. Install dependencies

```bash
npm install
```

### 5. Start development servers

```bash
npm run dev
# API: http://localhost:3001
# Web: http://localhost:3000
# API Docs: http://localhost:3001/api/docs
```

---

## Key Features by Phase

### Phase 1 (Months 1–4) — Foundation
- ✅ B2B/B2G gate (no consumers, enforced at DB level)
- ✅ KYB verification via Creditsafe + Companies House
- ✅ 20-country support with regulatory_regime routing
- ✅ entity_locations table created (visibility locked to 'hidden')

### Phase 2 (Months 5–8) — Location Feature Launch
- ✅ Location Settings UI with GDPR opt-in flow
- ✅ Google Maps + HERE Maps geocoding pipeline
- ✅ Postcard verification via Lob.com
- ✅ Mapbox interactive maps on supplier profiles
- ✅ Proximity search ("suppliers within X km")
- ✅ Delivery radius overlay on listing pages
- ✅ Elasticsearch geo_point indexing
- ✅ Sole trader privacy protections

### Phase 3 (Months 9–14) — Procurement
- ✅ EU Directive 2014/24 + UK Procurement Act 2023
- ✅ Geo-eligibility polygon for tenders (below-threshold only)
- ✅ TED eSender + UK FTS integration

### Phase 4 (Months 15–19) — Invest Business Integration
- ✅ ib-compatible-entity.schema.json v2 with location fields
- ✅ SSO bridge + entity sync
- ✅ Pan-European supplier heatmap

---

## Location Feature (v4)

### Privacy-First Design

All locations default to `hidden`. The visibility ladder:

```
hidden → country_region → city → street_level / verified_members
```

**Sole traders** have extra protections — visibility cannot exceed `city` without explicit admin approval.

### Verification Methods

| Location Type | Method | Turnaround |
|--------------|--------|-----------|
| Registered Office | KYB match (auto) | Instant |
| Operational HQ / Branch | Document upload | ≤24h |
| Warehouse / Delivery Hub | Postcard or Document | 5-10 days / 24h |

### Geocoding Pipeline

```
Address input
  → Google Maps API (confidence ≥ 0.85 → verified)
  → HERE Maps API fallback (confidence ≥ 0.70 → verified)
  → Manual admin review (< 0.70 or both fail)
```

### PostGIS Queries

```sql
-- Find suppliers within 150km of Brussels
SELECT *, ST_Distance(coordinates, ST_SetSRID(ST_MakePoint(4.35, 50.85), 4326)::geography) / 1000 AS km
FROM entity_locations
WHERE ST_DWithin(coordinates, ST_SetSRID(ST_MakePoint(4.35, 50.85), 4326)::geography, 150000)
  AND address_verified = true
  AND visibility != 'hidden'
ORDER BY km;
```

---

## API Reference

Full Swagger docs at `http://localhost:3001/api/docs`

### Key endpoints

```
POST   /api/v1/auth/register              Register business entity
POST   /api/v1/auth/login                 Login
GET    /api/v1/entities/:id/locations     List entity locations
POST   /api/v1/entities/:id/locations     Add location (triggers geocoding)
PATCH  /api/v1/entities/:id/locations/:id Update visibility/delivery
GET    /api/v1/marketplace/search/suppliers/nearby   Proximity search
GET    /api/v1/marketplace/search/suppliers/map      Map viewport
GET    /api/v1/marketplace/listings       Browse listings
POST   /api/v1/marketplace/rfqs           Create RFQ
GET    /api/v1/marketplace/tenders        Browse tenders
```

---

## GDPR Compliance Checklist

- [x] Opt-in per location per visibility level
- [x] Right to withdraw: set any location to `hidden` instantly
- [x] Data minimisation: API responses strip coordinates for non-entitled tiers
- [x] Sole trader special handling (home address protection)
- [x] DPIA required before street-level feature goes live (Phase 2)
- [x] Location history immutable audit log
- [x] Visibility enforcement at both PostGIS query AND API serialiser
- [x] UK GDPR: 6-year retention for location history
- [x] `regulatory_regime` field routes all legal logic per entity

---

## Countries

| Country | Registry | Currency |
|---------|----------|----------|
| 🇦🇹 Austria | Firmenbuch | EUR |
| 🇧🇪 Belgium | BCE/KBO | EUR |
| 🇨🇾 Cyprus | Registrar | EUR |
| 🇩🇪 Germany | Handelsregister | EUR |
| 🇪🇸 Spain | Registro Mercantil | EUR |
| 🇫🇷 France | INSEE SIREN | EUR |
| 🇬🇧 United Kingdom | Companies House | **GBP** |
| 🇮🇪 Ireland | CRO | EUR |
| 🇮🇹 Italy | Registro Imprese | EUR |
| 🇳🇱 Netherlands | KvK | EUR |
| + 10 more EU states | | EUR |

---

*IB Marketplace v4.0 · Confidential — Development Team Only*  
*Parent ecosystem: investbusiness.com*
