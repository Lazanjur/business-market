// apps/api/src/modules/search/elasticsearch.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: any;
  private readonly INDEX_LISTINGS = 'ib_listings';
  private readonly INDEX_SUPPLIERS = 'ib_suppliers';

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    try {
      const { Client } = await import('@elastic/elasticsearch');
      this.client = new Client({
        node: this.config.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200'),
      });
      await this.ensureIndices();
      this.logger.log('Elasticsearch connected');
    } catch (err: any) {
      this.logger.warn(`Elasticsearch not available: ${err.message}`);
    }
  }

  // ── INDEX MAPPINGS ────────────────────────────────────────────────────────────
  private async ensureIndices() {
    // Listings index with geo_point
    const listingsMapping = {
      mappings: {
        properties: {
          listing_id: { type: 'keyword' },
          title: { type: 'text', analyzer: 'standard' },
          description: { type: 'text' },
          category_id: { type: 'integer' },
          seller_id: { type: 'keyword' },
          seller_country: { type: 'keyword' },
          seller_name: { type: 'text' },
          price: { type: 'float' },
          currency: { type: 'keyword' },
          status: { type: 'keyword' },
          tags: { type: 'keyword' },
          trust_score: { type: 'integer' },
          verification_tier: { type: 'keyword' },
          // Location (v4) — geo_point for proximity queries
          dispatch_location: {
            type: 'object',
            properties: {
              // geo_point enables ST_DWithin-equivalent queries in Elasticsearch
              coordinates: { type: 'geo_point' },
              city: { type: 'keyword' },
              country_code: { type: 'keyword' },
              location_type: { type: 'keyword' },
              delivery_radius_km: { type: 'integer' },
              delivery_countries: { type: 'keyword' },
            },
          },
          published_at: { type: 'date' },
          expires_at: { type: 'date' },
          updated_at: { type: 'date' },
        },
      },
      settings: {
        analysis: {
          analyzer: {
            standard: { type: 'standard' },
          },
        },
      },
    };

    const exists = await this.client.indices.exists({ index: this.INDEX_LISTINGS });
    if (!exists) {
      await this.client.indices.create({
        index: this.INDEX_LISTINGS,
        body: listingsMapping,
      });
      this.logger.log(`Created Elasticsearch index: ${this.INDEX_LISTINGS}`);
    }
  }

  // ── INDEX LISTING ─────────────────────────────────────────────────────────────
  async indexListing(listing: any, location?: any) {
    if (!this.client) return;

    const doc = {
      listing_id: listing.id,
      title: listing.title,
      description: listing.description,
      category_id: listing.category_id,
      seller_id: listing.seller_id,
      seller_country: listing.seller_country,
      seller_name: listing.seller_name,
      price: listing.price,
      currency: listing.currency,
      status: listing.status,
      tags: listing.tags || [],
      trust_score: listing.trust_score,
      verification_tier: listing.verification_tier,
      published_at: listing.published_at,
      expires_at: listing.expires_at,
      updated_at: new Date().toISOString(),
    };

    // Embed location if available
    if (location?.coordinates_lat && location?.coordinates_lng) {
      (doc as any).dispatch_location = {
        coordinates: {
          lat: location.coordinates_lat,
          lon: location.coordinates_lng,
        },
        city: location.city,
        country_code: location.country_code,
        location_type: location.location_type,
        delivery_radius_km: location.delivery_radius_km,
        delivery_countries: location.delivery_countries || [],
      };
    }

    await this.client.index({
      index: this.INDEX_LISTINGS,
      id: listing.id,
      body: doc,
    });
  }

  // ── PROXIMITY SEARCH ─────────────────────────────────────────────────────────
  async searchNearby(params: {
    lat: number;
    lng: number;
    radius_km: number;
    query?: string;
    category_id?: number;
    currency?: string;
    min_price?: number;
    max_price?: number;
    verified_only?: boolean;
    page?: number;
    per_page?: number;
  }) {
    if (!this.client) return { hits: [], total: 0 };

    const { lat, lng, radius_km, query, category_id, verified_only = true, page = 1, per_page = 20 } = params;

    const mustClauses: any[] = [
      { term: { status: 'active' } },
    ];

    if (query) {
      mustClauses.push({
        multi_match: {
          query,
          fields: ['title^3', 'description^1', 'seller_name^2'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    }

    if (category_id) mustClauses.push({ term: { category_id } });
    if (verified_only) {
      mustClauses.push({
        terms: { verification_tier: ['standard', 'premium', 'public_authority'] },
      });
    }

    const filterClauses: any[] = [
      {
        // Proximity filter using Elasticsearch geo_distance (equivalent to PostGIS ST_DWithin)
        geo_distance: {
          distance: `${radius_km}km`,
          'dispatch_location.coordinates': { lat, lon: lng },
        },
      },
    ];

    const esQuery = {
      index: this.INDEX_LISTINGS,
      body: {
        query: {
          bool: {
            must: mustClauses,
            filter: filterClauses,
          },
        },
        sort: [
          {
            _geo_distance: {
              'dispatch_location.coordinates': { lat, lon: lng },
              order: 'asc',
              unit: 'km',
            },
          },
          { trust_score: { order: 'desc' } },
        ],
        from: (page - 1) * per_page,
        size: per_page,
        // Script fields to return distance
        script_fields: {
          distance_km: {
            script: {
              source: `
                def loc = params['_source']['dispatch_location'];
                if (loc == null || loc.coordinates == null) return -1;
                return GeoUtils.arcDistance(
                  loc.coordinates.lat, loc.coordinates.lon,
                  params.lat, params.lon
                ) / 1000.0;
              `,
              params: { lat, lon: lng },
            },
          },
        },
      },
    };

    const result = await this.client.search(esQuery);
    return {
      hits: result.hits.hits.map((h: any) => ({
        ...h._source,
        distance_km: h.fields?.distance_km?.[0] || null,
        _score: h._score,
      })),
      total: result.hits.total?.value || 0,
    };
  }

  // ── TEXT SEARCH ───────────────────────────────────────────────────────────────
  async textSearch(params: {
    query: string;
    category_id?: number;
    country_codes?: string[];
    page?: number;
    per_page?: number;
  }) {
    if (!this.client) return { hits: [], total: 0 };

    const { query, category_id, country_codes, page = 1, per_page = 20 } = params;

    const mustClauses: any[] = [
      { term: { status: 'active' } },
      {
        multi_match: {
          query,
          fields: ['title^3', 'description', 'seller_name^2', 'tags^2'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    if (category_id) mustClauses.push({ term: { category_id } });
    if (country_codes?.length) mustClauses.push({ terms: { seller_country: country_codes } });

    const result = await this.client.search({
      index: this.INDEX_LISTINGS,
      body: {
        query: { bool: { must: mustClauses } },
        sort: [{ _score: { order: 'desc' } }, { trust_score: { order: 'desc' } }],
        from: (page - 1) * per_page,
        size: per_page,
        highlight: {
          fields: {
            title: { number_of_fragments: 0 },
            description: { fragment_size: 150, number_of_fragments: 2 },
          },
        },
      },
    });

    return {
      hits: result.hits.hits.map((h: any) => ({
        ...h._source,
        highlights: h.highlight,
        _score: h._score,
      })),
      total: result.hits.total?.value || 0,
    };
  }

  // ── BBOX QUERY ────────────────────────────────────────────────────────────────
  async bboxSearch(params: {
    sw_lat: number; sw_lng: number;
    ne_lat: number; ne_lng: number;
    category_id?: number;
  }) {
    if (!this.client) return { hits: [] };

    const { sw_lat, sw_lng, ne_lat, ne_lng, category_id } = params;

    const filterClauses: any[] = [
      { term: { status: 'active' } },
      {
        geo_bounding_box: {
          'dispatch_location.coordinates': {
            top_left: { lat: ne_lat, lon: sw_lng },
            bottom_right: { lat: sw_lat, lon: ne_lng },
          },
        },
      },
    ];

    if (category_id) filterClauses.push({ term: { category_id } });

    const result = await this.client.search({
      index: this.INDEX_LISTINGS,
      size: 500,
      body: {
        query: { bool: { filter: filterClauses } },
        _source: ['listing_id', 'title', 'seller_id', 'seller_name', 'trust_score',
                  'dispatch_location', 'price', 'currency', 'category_id'],
      },
    });

    return { hits: result.hits.hits.map((h: any) => h._source) };
  }

  // ── EVENT HANDLERS ────────────────────────────────────────────────────────────
  @OnEvent('location.geocoded')
  async handleLocationGeocoded(payload: { locationId: string; lat: number; lng: number }) {
    if (!this.client) return;
    // Re-index all listings using this location
    await this.client.updateByQuery({
      index: this.INDEX_LISTINGS,
      body: {
        script: {
          source: `
            ctx._source.dispatch_location.coordinates = ['lat': params.lat, 'lon': params.lng]
          `,
          params: { lat: payload.lat, lng: payload.lng },
        },
        query: {
          term: { 'dispatch_location_id': payload.locationId },
        },
      },
    });
    this.logger.log(`Re-indexed listings for geocoded location ${payload.locationId}`);
  }

  @OnEvent('listing.published')
  async handleListingPublished(payload: any) {
    await this.indexListing(payload.listing, payload.location);
  }

  @OnEvent('listing.updated')
  async handleListingUpdated(payload: any) {
    await this.indexListing(payload.listing, payload.location);
  }

  @OnEvent('listing.deleted')
  async handleListingDeleted(payload: { listingId: string }) {
    if (!this.client) return;
    await this.client.delete({ index: this.INDEX_LISTINGS, id: payload.listingId });
  }
}
