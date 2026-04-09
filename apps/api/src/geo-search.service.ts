// apps/api/src/modules/location/geo-search.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ElasticsearchService } from '../search/elasticsearch.service';
import { NearbySearchDto } from './dto/nearby-search.dto';
import { MapBboxSearchDto } from './dto/map-bbox-search.dto';

@Injectable()
export class GeoSearchService {
  private readonly logger = new Logger(GeoSearchService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly elasticsearch: ElasticsearchService,
  ) {}

  // ── NEARBY SUPPLIERS (PostGIS + verified filter) ─────────────────────────────
  async findNearbySuppliers(query: NearbySearchDto, viewer: any) {
    const {
      lat, lng, radius_km = 100, location_type,
      category_id, country_code, verified_only = true,
      limit = 20, offset = 0,
    } = query;

    const maxRadius = 1000;
    const safeRadius = Math.min(radius_km, maxRadius);
    const safeLimit = Math.min(limit, 50);

    // Build visibility filter based on viewer tier
    const viewerTier = viewer.verification_tier;
    const canSeeStreet = ['standard', 'premium', 'public_authority'].includes(viewerTier);
    const visibilityFilter = canSeeStreet
      ? `el.visibility IN ('city', 'street_level', 'verified_members', 'country_region')`
      : `el.visibility IN ('city', 'country_region')`;

    const params: any[] = [
      lng, lat,                           // $1, $2
      safeRadius * 1000,                  // $3 — radius in metres
      safeLimit,                          // $4
      offset,                             // $5
    ];
    let paramCount = 6;

    let extraFilters = `AND ${visibilityFilter}`;

    if (verified_only) {
      extraFilters += ` AND el.address_verified = true`;
    }
    if (location_type) {
      extraFilters += ` AND el.location_type = $${paramCount++}`;
      params.push(location_type);
    }
    if (category_id) {
      extraFilters += ` AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.seller_id = u.id AND l.category_id = $${paramCount++} AND l.status = 'active'
      )`;
      params.push(category_id);
    }
    if (country_code) {
      extraFilters += ` AND el.country_code = $${paramCount++}`;
      params.push(country_code);
    }

    const result = await this.db.query(`
      SELECT
        el.id                                                         AS location_id,
        el.entity_id,
        el.location_type,
        el.visibility,
        el.city,
        el.region,
        el.country_code                                               AS location_country,
        el.delivery_radius_km,
        el.delivery_countries,
        el.address_verified,
        u.company_name,
        u.trust_score,
        u.verification_tier,
        u.logo_url,
        u.industries,
        -- Distance in km
        ROUND(
          (ST_Distance(el.coordinates, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000.0)::numeric,
          1
        )                                                             AS distance_km,
        -- Conditionally return address details
        CASE WHEN el.visibility IN ('street_level', 'verified_members')
          AND (${ canSeeStreet ? 'true' : 'false' })
          THEN el.address_line1 ELSE NULL END                        AS address_line1,
        CASE WHEN el.visibility IN ('street_level', 'verified_members', 'city')
          THEN ST_Y(el.coordinates::geometry)::numeric(10,6)
          ELSE NULL END                                               AS approx_lat,
        CASE WHEN el.visibility IN ('street_level', 'verified_members', 'city')
          THEN ST_X(el.coordinates::geometry)::numeric(10,6)
          ELSE NULL END                                               AS approx_lng,
        -- Total count for pagination
        COUNT(*) OVER ()                                              AS total_count,
        -- Active listing count
        (SELECT COUNT(*) FROM listings l
         WHERE l.seller_id = u.id AND l.status = 'active')           AS active_listing_count
      FROM entity_locations el
      JOIN users u ON u.id = el.entity_id
      WHERE
        el.is_active = true
        AND u.is_active = true
        AND u.is_suspended = false
        AND el.coordinates IS NOT NULL
        AND el.geocode_status = 'verified'
        AND ST_DWithin(
          el.coordinates,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3  -- metres
        )
        ${extraFilters}
      ORDER BY distance_km ASC
      LIMIT $4 OFFSET $5
    `, params);

    return {
      results: result.rows,
      total: result.rows[0]?.total_count || 0,
      query: { lat, lng, radius_km: safeRadius },
      pagination: { limit: safeLimit, offset },
    };
  }

  // ── MAP BOUNDING BOX ─────────────────────────────────────────────────────────
  async findInBoundingBox(query: MapBboxSearchDto, viewer: any) {
    const { bbox, location_type, category_id, verified_only = true, cluster = true } = query;

    // Parse bbox: SW_lat,SW_lng,NE_lat,NE_lng
    const [swLat, swLng, neLat, neLng] = bbox.split(',').map(Number);
    if ([swLat, swLng, neLat, neLng].some(isNaN)) {
      throw new Error('Invalid bbox format. Expected: SW_lat,SW_lng,NE_lat,NE_lng');
    }

    const viewerTier = viewer.verification_tier;
    const canSeeStreet = ['standard', 'premium', 'public_authority'].includes(viewerTier);

    const params: any[] = [swLng, swLat, neLng, neLat];
    let paramCount = 5;
    let extraFilters = canSeeStreet
      ? `AND el.visibility IN ('city','street_level','verified_members','country_region')`
      : `AND el.visibility IN ('city','country_region')`;

    if (verified_only) extraFilters += ` AND el.address_verified = true`;
    if (location_type) {
      extraFilters += ` AND el.location_type = $${paramCount++}`;
      params.push(location_type);
    }

    const result = await this.db.query(`
      SELECT
        el.id           AS location_id,
        el.entity_id,
        el.location_type,
        el.city,
        el.country_code,
        u.company_name,
        u.trust_score,
        u.verification_tier,
        u.logo_url,
        -- Coordinates (respecting privacy)
        CASE
          WHEN el.visibility IN ('street_level','verified_members') AND ${canSeeStreet ? 'true' : 'false'}
          THEN ST_Y(el.coordinates::geometry)
          ELSE ST_Y(ST_Centroid(
            ST_Collect(el.coordinates::geometry) OVER (PARTITION BY el.city, el.country_code)
          ))
        END AS lat,
        CASE
          WHEN el.visibility IN ('street_level','verified_members') AND ${canSeeStreet ? 'true' : 'false'}
          THEN ST_X(el.coordinates::geometry)
          ELSE ST_X(ST_Centroid(
            ST_Collect(el.coordinates::geometry) OVER (PARTITION BY el.city, el.country_code)
          ))
        END AS lng,
        el.delivery_radius_km,
        el.address_verified
      FROM entity_locations el
      JOIN users u ON u.id = el.entity_id
      WHERE
        el.is_active = true
        AND u.is_active = true
        AND u.is_suspended = false
        AND el.coordinates IS NOT NULL
        AND el.geocode_status = 'verified'
        AND el.coordinates && ST_MakeEnvelope($1, $2, $3, $4, 4326)::geography
        ${extraFilters}
      ORDER BY u.trust_score DESC
      LIMIT 500
    `, params);

    // Client-side clustering hint (actual clustering done by Mapbox GL JS)
    return {
      type: 'FeatureCollection',
      features: result.rows.map(row => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [row.lng, row.lat],
        },
        properties: {
          location_id: row.location_id,
          entity_id: row.entity_id,
          location_type: row.location_type,
          city: row.city,
          country_code: row.country_code,
          company_name: row.company_name,
          trust_score: row.trust_score,
          verification_tier: row.verification_tier,
          logo_url: row.logo_url,
          delivery_radius_km: row.delivery_radius_km,
          address_verified: row.address_verified,
        },
      })),
    };
  }

  // ── DELIVERY COVERAGE GEOJSON ────────────────────────────────────────────────
  async getDeliveryCoverage(listingId: string) {
    const result = await this.db.queryOne(`
      SELECT
        el.delivery_radius_km,
        el.delivery_countries,
        el.delivery_notes,
        el.city,
        el.country_code,
        ST_Y(el.coordinates::geometry) AS lat,
        ST_X(el.coordinates::geometry) AS lng,
        -- GeoJSON circle approximation (buffer around point)
        ST_AsGeoJSON(
          ST_Buffer(el.coordinates, el.delivery_radius_km * 1000)
        ) AS coverage_polygon
      FROM listings l
      JOIN entity_locations el ON el.id = l.dispatch_location_id
      WHERE l.id = $1
        AND l.show_location_on_listing = true
        AND el.is_active = true
        AND el.visibility != 'hidden'
    `, [listingId]);

    if (!result) return null;

    return {
      type: 'Feature',
      geometry: result.coverage_polygon ? JSON.parse(result.coverage_polygon) : null,
      properties: {
        center: { lat: result.lat, lng: result.lng },
        radius_km: result.delivery_radius_km,
        city: result.city,
        country_code: result.country_code,
        delivery_notes: result.delivery_notes,
        delivery_countries: result.delivery_countries,
      },
    };
  }

  // ── PAN-EUROPEAN HEATMAP ─────────────────────────────────────────────────────
  async getSupplierHeatmap(categoryId?: number) {
    const params: any[] = [];
    let categoryFilter = '';
    if (categoryId) {
      categoryFilter = `AND EXISTS (
        SELECT 1 FROM listings l
        WHERE l.seller_id = u.id AND l.category_id = $1 AND l.status = 'active'
      )`;
      params.push(categoryId);
    }

    const result = await this.db.query(`
      SELECT
        ST_Y(el.coordinates::geometry) AS lat,
        ST_X(el.coordinates::geometry) AS lng,
        el.country_code,
        COUNT(*) AS intensity
      FROM entity_locations el
      JOIN users u ON u.id = el.entity_id
      WHERE el.is_active = true
        AND el.address_verified = true
        AND el.visibility != 'hidden'
        AND el.coordinates IS NOT NULL
        AND u.is_active = true
        AND u.is_suspended = false
        ${categoryFilter}
      GROUP BY
        ROUND(ST_Y(el.coordinates::geometry)::numeric, 2),
        ROUND(ST_X(el.coordinates::geometry)::numeric, 2),
        el.country_code
    `, params);

    return result.rows;
  }
}
