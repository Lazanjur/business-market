// apps/api/src/modules/location/geocoding.worker.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios from 'axios';
import { DatabaseService } from '../../database/database.service';

interface GeocodingResult {
  lat: number;
  lng: number;
  confidence: number;
  provider: string;
  formattedAddress?: string;
}

@Processor('geocoding')
export class GeocodingWorker {
  private readonly logger = new Logger(GeocodingWorker.name);

  private readonly GOOGLE_API_KEY: string;
  private readonly HERE_API_KEY: string;
  private readonly CONFIDENCE_THRESHOLD_HIGH = 0.85;
  private readonly CONFIDENCE_THRESHOLD_LOW = 0.70;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly events: EventEmitter2,
  ) {
    this.GOOGLE_API_KEY = this.config.get<string>('GOOGLE_MAPS_API_KEY', '');
    this.HERE_API_KEY = this.config.get<string>('HERE_MAPS_API_KEY', '');
  }

  @Process('geocode-location')
  async geocodeLocation(job: Job<{ locationId: string }>) {
    const { locationId } = job.data;
    this.logger.log(`Geocoding location: ${locationId}`);

    // Fetch the location details
    const location = await this.db.queryOne(
      `SELECT * FROM entity_locations WHERE id = $1`, [locationId]
    );

    if (!location) {
      this.logger.warn(`Location ${locationId} not found`);
      return;
    }

    // Mark as processing
    await this.db.query(
      `UPDATE entity_locations SET geocode_status = 'pending' WHERE id = $1`,
      [locationId]
    );
    await this.db.query(
      `UPDATE geocoding_jobs SET status = 'processing', attempts = attempts + 1, last_attempt_at = NOW()
       WHERE location_id = $1 AND status = 'queued'`,
      [locationId]
    );

    const addressString = this.buildAddressString(location);
    let result: GeocodingResult | null = null;

    // Step 1: Try Google Maps (primary)
    if (this.GOOGLE_API_KEY) {
      result = await this.tryGoogleGeocoding(addressString, location.country_code);
      if (result && result.confidence >= this.CONFIDENCE_THRESHOLD_HIGH) {
        this.logger.log(`Google geocoding succeeded: confidence ${result.confidence}`);
        await this.saveCoordinates(locationId, result);
        return;
      }
    }

    // Step 2: Try HERE Maps (fallback)
    if (this.HERE_API_KEY) {
      const hereResult = await this.tryHereGeocoding(addressString, location.country_code);
      if (hereResult && hereResult.confidence >= this.CONFIDENCE_THRESHOLD_LOW) {
        // Use HERE if better than Google result
        if (!result || hereResult.confidence > result.confidence) {
          result = hereResult;
        }
      }
      if (result && result.confidence >= this.CONFIDENCE_THRESHOLD_LOW) {
        this.logger.log(`HERE geocoding succeeded: confidence ${result.confidence}`);
        await this.saveCoordinates(locationId, result);
        return;
      }
    }

    // Step 3: All failed or below threshold — manual review
    this.logger.warn(`Geocoding failed for location ${locationId}: confidence too low`);
    await this.db.query(
      `UPDATE entity_locations SET geocode_status = 'failed' WHERE id = $1`,
      [locationId]
    );
    await this.db.query(
      `UPDATE geocoding_jobs SET status = 'failed', error_message = 'Low confidence or no result'
       WHERE location_id = $1`,
      [locationId]
    );

    // Notify entity
    const entity = await this.db.queryOne(
      'SELECT id, email FROM users WHERE id = $1',
      [location.entity_id]
    );
    if (entity) {
      this.events.emit('location.geocoding_failed', {
        entityId: entity.id,
        email: entity.email,
        locationId,
      });
    }
  }

  private async tryGoogleGeocoding(
    address: string,
    countryCode: string
  ): Promise<GeocodingResult | null> {
    try {
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address,
            components: `country:${countryCode}`,
            key: this.GOOGLE_API_KEY,
          },
          timeout: 8000,
        }
      );

      if (response.data.status !== 'OK' || !response.data.results.length) {
        return null;
      }

      const result = response.data.results[0];
      const confidence = this.calculateGoogleConfidence(result);

      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        confidence,
        provider: 'google',
        formattedAddress: result.formatted_address,
      };
    } catch (err: any) {
      this.logger.warn(`Google geocoding error: ${err.message}`);
      return null;
    }
  }

  private async tryHereGeocoding(
    address: string,
    countryCode: string
  ): Promise<GeocodingResult | null> {
    try {
      const response = await axios.get(
        'https://geocode.search.hereapi.com/v1/geocode',
        {
          params: {
            q: address,
            in: `countryCode:${countryCode}`,
            limit: 1,
            apiKey: this.HERE_API_KEY,
          },
          timeout: 8000,
        }
      );

      if (!response.data.items?.length) return null;

      const item = response.data.items[0];
      const confidence = this.calculateHereConfidence(item);

      return {
        lat: item.position.lat,
        lng: item.position.lng,
        confidence,
        provider: 'here',
        formattedAddress: item.address?.label,
      };
    } catch (err: any) {
      this.logger.warn(`HERE geocoding error: ${err.message}`);
      return null;
    }
  }

  private async saveCoordinates(locationId: string, result: GeocodingResult) {
    await this.db.query(`
      UPDATE entity_locations
      SET
        coordinates = ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
        geocode_status = 'verified',
        geocode_provider = $4,
        geocode_confidence = $5,
        updated_at = NOW()
      WHERE id = $1
    `, [locationId, result.lng, result.lat, result.provider, result.confidence]);

    await this.db.query(
      `UPDATE geocoding_jobs SET status = 'done' WHERE location_id = $1`,
      [locationId]
    );

    // Invalidate Elasticsearch index for listings using this location
    this.events.emit('location.geocoded', {
      locationId,
      lat: result.lat,
      lng: result.lng,
      provider: result.provider,
    });
  }

  private buildAddressString(location: any): string {
    return [
      location.address_line1,
      location.address_line2,
      location.city,
      location.region,
      location.postal_code,
    ].filter(Boolean).join(', ');
  }

  private calculateGoogleConfidence(result: any): number {
    const locationType = result.geometry.location_type;
    const types = result.types;

    // Exact street address
    if (locationType === 'ROOFTOP') return 0.95;
    if (locationType === 'RANGE_INTERPOLATED') return 0.82;

    // Business / premises match
    if (types.includes('premise') || types.includes('establishment')) return 0.88;

    // Route / street level
    if (locationType === 'GEOMETRIC_CENTER' && types.includes('route')) return 0.75;

    // Locality
    if (types.includes('locality')) return 0.65;

    return 0.50;
  }

  private calculateHereConfidence(item: any): number {
    const scoring = item.scoring;
    if (!scoring) return 0.65;

    const matchLevel = item.resultType;
    if (matchLevel === 'houseNumber') return scoring.queryScore || 0.90;
    if (matchLevel === 'street') return scoring.queryScore || 0.75;
    if (matchLevel === 'city') return scoring.queryScore || 0.60;

    return scoring.queryScore || 0.55;
  }
}
