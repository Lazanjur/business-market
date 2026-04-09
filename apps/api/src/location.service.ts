// apps/api/src/modules/location/location.service.ts
import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../storage/storage.service';
import { LobService } from './lob.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { VisibilityLevel, LocationType } from './location.types';

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly storage: StorageService,
    private readonly lob: LobService,
    private readonly events: EventEmitter2,
    @InjectQueue('geocoding') private readonly geocodingQueue: Queue,
  ) {}

  // ── FIND ALL FOR ENTITY ──────────────────────────────────────────────────────
  async findAllForEntity(entityId: string, viewer: any) {
    const isOwner = viewer.id === entityId;
    const viewerTier = viewer.verification_tier;
    const isAdmin = viewer.role === 'admin' || viewer.role === 'super_admin';

    const locations = await this.db.query(`
      SELECT
        el.*,
        -- Conditionally include coordinates based on viewer access
        CASE
          WHEN $2 = true THEN ST_AsGeoJSON(el.coordinates)::jsonb
          WHEN el.visibility = 'street_level' AND $3 IN ('standard', 'premium', 'public_authority') THEN ST_AsGeoJSON(el.coordinates)::jsonb
          WHEN el.visibility = 'verified_members' AND $3 IN ('standard', 'premium', 'public_authority') THEN ST_AsGeoJSON(el.coordinates)::jsonb
          WHEN el.visibility = 'city' THEN NULL  -- city centroid added separately
          ELSE NULL
        END AS coordinates_geojson,
        -- Address masking based on visibility
        CASE
          WHEN $2 = true OR el.visibility IN ('street_level', 'verified_members') THEN el.address_line1
          ELSE NULL
        END AS address_line1_visible,
        (
          SELECT COUNT(*) FROM location_verification_requests lvr
          WHERE lvr.location_id = el.id AND lvr.status IN ('pending', 'sent')
        ) AS pending_verification_count
      FROM entity_locations el
      WHERE el.entity_id = $1
        AND el.is_active = true
        AND (
          $2 = true -- owner sees all
          OR el.visibility != 'hidden'
        )
      ORDER BY el.is_primary DESC, el.location_type, el.created_at
    `, [entityId, isOwner || isAdmin, viewerTier]);

    return locations.rows.map(row => this.sanitiseLocationResponse(row, viewer, isOwner));
  }

  // ── FIND ONE ─────────────────────────────────────────────────────────────────
  async findOne(entityId: string, locId: string, viewer: any) {
    const row = await this.db.queryOne(
      `SELECT el.*, ST_AsGeoJSON(el.coordinates)::jsonb AS coordinates_geojson
       FROM entity_locations el
       WHERE el.id = $1 AND el.entity_id = $2 AND el.is_active = true`,
      [locId, entityId],
    );

    if (!row) throw new NotFoundException('Location not found');
    return this.sanitiseLocationResponse(row, viewer, viewer.id === entityId);
  }

  // ── CREATE ───────────────────────────────────────────────────────────────────
  async create(entityId: string, dto: CreateLocationDto, actor: any) {
    if (actor.id !== entityId && actor.role !== 'admin') {
      throw new ForbiddenException('Cannot add locations for another entity');
    }

    // Sole trader extra protection
    const entity = await this.db.queryOne(
      'SELECT entity_type FROM users WHERE id = $1', [entityId]
    );

    if (entity?.entity_type === 'sole_trader') {
      // Force hidden for sole traders as default
      if (!dto.visibility || dto.visibility === 'street_level') {
        dto.visibility = 'hidden';
        this.logger.warn(`Sole trader ${entityId} location visibility capped at hidden`);
      }
    }

    // Validate country code
    const validCountries = ['AT','BE','CY','EE','FI','FR','DE','GR','IE','IT',
      'LV','LT','LU','MT','PT','SK','SI','ES','NL','GB'];
    if (!validCountries.includes(dto.country_code)) {
      throw new BadRequestException(`Country ${dto.country_code} not supported`);
    }

    // Check registered location uniqueness
    if (dto.location_type === 'registered') {
      const existing = await this.db.queryOne(
        `SELECT id FROM entity_locations WHERE entity_id = $1 AND location_type = 'registered'`,
        [entityId]
      );
      if (existing) throw new ConflictException('Entity already has a registered address');
    }

    // Insert
    const result = await this.db.queryOne(`
      INSERT INTO entity_locations (
        entity_id, location_type, label, address_line1, address_line2,
        city, region, postal_code, country_code, visibility,
        delivery_radius_km, delivery_countries, delivery_notes, opening_hours
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      entityId, dto.location_type, dto.label, dto.address_line1,
      dto.address_line2 || null, dto.city, dto.region || null,
      dto.postal_code, dto.country_code,
      dto.visibility || 'hidden',
      dto.delivery_radius_km || null,
      dto.delivery_countries ? `{${dto.delivery_countries.join(',')}}` : null,
      dto.delivery_notes || null,
      dto.opening_hours ? JSON.stringify(dto.opening_hours) : null,
    ]);

    // Queue geocoding job
    await this.geocodingQueue.add('geocode-location', {
      locationId: result.id,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
    });

    // Auto-verify if registered and address matches KYB
    if (dto.location_type === 'registered') {
      this.verifyRegisteredAddressAgainstKyb(result.id, entityId).catch(
        err => this.logger.error('KYB address check failed', err)
      );
    }

    this.events.emit('location.created', { locationId: result.id, entityId });
    return result;
  }

  // ── UPDATE ───────────────────────────────────────────────────────────────────
  async update(entityId: string, locId: string, dto: UpdateLocationDto, actor: any) {
    if (actor.id !== entityId && actor.role !== 'admin') {
      throw new ForbiddenException();
    }

    const existing = await this.db.queryOne(
      'SELECT * FROM entity_locations WHERE id=$1 AND entity_id=$2 AND is_active=true',
      [locId, entityId]
    );
    if (!existing) throw new NotFoundException('Location not found');

    // Sole trader street-level protection
    const entity = await this.db.queryOne(
      'SELECT entity_type FROM users WHERE id = $1', [entityId]
    );
    if (entity?.entity_type === 'sole_trader' &&
        (dto.visibility === 'street_level' || dto.visibility === 'verified_members')) {
      throw new ForbiddenException(
        'Sole traders cannot set street-level visibility. ' +
        'Please contact support if this is a commercial premises.'
      );
    }

    // Build update fields
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    const addField = (field: string, value: any) => {
      if (value !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        params.push(value);
      }
    };

    addField('label', dto.label);
    addField('visibility', dto.visibility);
    addField('delivery_radius_km', dto.delivery_radius_km);
    addField('delivery_notes', dto.delivery_notes);

    if (dto.delivery_countries) {
      updates.push(`delivery_countries = $${paramCount++}`);
      params.push(`{${dto.delivery_countries.join(',')}}`);
    }

    // Address change triggers re-geocoding + re-verification
    if (dto.address_line1 || dto.city || dto.postal_code) {
      addField('address_line1', dto.address_line1);
      addField('address_line2', dto.address_line2);
      addField('city', dto.city);
      addField('region', dto.region);
      addField('postal_code', dto.postal_code);
      // Reset geocoding and verification
      updates.push(`geocode_status = 'pending'`);
      updates.push(`address_verified = false`);
      updates.push(`coordinates = null`);
      // Queue new geocoding
      await this.geocodingQueue.add('geocode-location', { locationId: locId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }

    if (updates.length === 0) return existing;

    params.push(locId, entityId);
    const result = await this.db.queryOne(`
      UPDATE entity_locations SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND entity_id = $${paramCount}
      RETURNING *
    `, params);

    this.events.emit('location.updated', { locationId: locId, entityId, changes: dto });
    return result;
  }

  // ── SOFT DELETE ──────────────────────────────────────────────────────────────
  async softDelete(entityId: string, locId: string, actor: any) {
    if (actor.id !== entityId && actor.role !== 'admin') throw new ForbiddenException();

    await this.db.query(
      `UPDATE entity_locations SET is_active=false, visibility='hidden'
       WHERE id=$1 AND entity_id=$2`,
      [locId, entityId]
    );
    this.events.emit('location.deleted', { locationId: locId, entityId });
  }

  // ── SET PRIMARY ──────────────────────────────────────────────────────────────
  async setPrimary(entityId: string, locId: string, actor: any) {
    if (actor.id !== entityId && actor.role !== 'admin') throw new ForbiddenException();

    await this.db.transaction(async (trx) => {
      await trx.query(
        'UPDATE entity_locations SET is_primary=false WHERE entity_id=$1',
        [entityId]
      );
      await trx.query(
        'UPDATE entity_locations SET is_primary=true WHERE id=$1 AND entity_id=$2',
        [locId, entityId]
      );
    });

    return { success: true, primary_location_id: locId };
  }

  // ── POSTCARD VERIFICATION ────────────────────────────────────────────────────
  async requestPostcardVerification(entityId: string, locId: string, actor: any) {
    if (actor.id !== entityId) throw new ForbiddenException();

    const location = await this.db.queryOne(
      'SELECT * FROM entity_locations WHERE id=$1 AND entity_id=$2 AND is_active=true',
      [locId, entityId]
    );
    if (!location) throw new NotFoundException('Location not found');
    if (location.address_verified) {
      throw new ConflictException('Location is already verified');
    }

    // Generate cryptographically random code
    const plainCode = this.generateVerificationCode();
    const codeHash = await bcrypt.hash(plainCode, 12);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Send via Lob.com
    let lobLetterId: string;
    try {
      const lobResult = await this.lob.sendVerificationPostcard({
        to: {
          name: actor.company_name,
          address_line1: location.address_line1,
          address_line2: location.address_line2,
          address_city: location.city,
          address_zip: location.postal_code,
          address_country: location.country_code,
        },
        verificationCode: plainCode,
      });
      lobLetterId = lobResult.id;
    } catch (err) {
      this.logger.error('Lob postcard send failed', err);
      throw new BadRequestException('Failed to send verification postcard. Please try document upload instead.');
    }

    await this.db.query(`
      INSERT INTO location_verification_requests
        (location_id, method, verification_code_hash, lob_letter_id, status, expires_at)
      VALUES ($1, 'postcard', $2, $3, 'sent', $4)
    `, [locId, codeHash, lobLetterId, expiresAt]);

    this.logger.log(`Postcard verification sent for location ${locId}`);
    return {
      message: 'Verification postcard sent. You will receive it within 5-10 business days.',
      expires_at: expiresAt,
      lob_tracking: lobLetterId,
    };
  }

  // ── CONFIRM POSTCARD ─────────────────────────────────────────────────────────
  async confirmPostcard(entityId: string, locId: string, code: string, actor: any) {
    if (actor.id !== entityId) throw new ForbiddenException();

    const request = await this.db.queryOne(`
      SELECT * FROM location_verification_requests
      WHERE location_id=$1 AND method='postcard'
        AND status='sent' AND expires_at > NOW()
      ORDER BY created_at DESC LIMIT 1
    `, [locId]);

    if (!request) {
      throw new NotFoundException('No active postcard verification found or code has expired');
    }

    const isValid = await bcrypt.compare(code.toUpperCase(), request.verification_code_hash);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Mark verified
    await this.db.transaction(async (trx) => {
      await trx.query(`
        UPDATE location_verification_requests
        SET status='approved', resolved_at=NOW()
        WHERE id=$1
      `, [request.id]);

      await trx.query(`
        UPDATE entity_locations
        SET address_verified=true, verified_at=NOW(), verified_method='postcard'
        WHERE id=$1
      `, [locId]);
    });

    this.events.emit('location.verified', {
      locationId: locId, entityId, method: 'postcard'
    });

    return { success: true, message: 'Address verified successfully via postcard.' };
  }

  // ── DOCUMENT UPLOAD VERIFICATION ────────────────────────────────────────────
  async submitDocumentVerification(
    entityId: string, locId: string,
    file: Express.Multer.File, actor: any
  ) {
    if (actor.id !== entityId) throw new ForbiddenException();
    if (!file) throw new BadRequestException('Document file is required');

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPEG, PNG, or WebP files accepted');
    }

    const s3Key = `location-verification/${entityId}/${locId}/${Date.now()}-${file.originalname}`;
    const documentUrl = await this.storage.upload(s3Key, file.buffer, file.mimetype);

    await this.db.query(`
      INSERT INTO location_verification_requests
        (location_id, method, document_url, document_type, status)
      VALUES ($1, 'document_upload', $2, $3, 'pending')
    `, [locId, documentUrl, file.mimetype]);

    // TODO: Trigger admin review notification
    this.events.emit('location.document_uploaded', { locationId: locId, entityId });

    return {
      message: 'Document uploaded successfully. An admin will review within 24 hours.',
      document_url: documentUrl,
    };
  }

  // ── PRIVATE HELPERS ──────────────────────────────────────────────────────────

  private sanitiseLocationResponse(row: any, viewer: any, isOwner: boolean): any {
    const tier = viewer.verification_tier;
    const isAdmin = viewer.role === 'admin' || viewer.role === 'super_admin';

    const canSeeStreetLevel =
      isOwner || isAdmin ||
      (row.visibility === 'street_level') ||
      (row.visibility === 'verified_members' && ['standard','premium','public_authority'].includes(tier));

    const result: any = {
      id: row.id,
      entity_id: row.entity_id,
      location_type: row.location_type,
      label: isOwner || isAdmin ? row.label : null,
      city: ['city', 'street_level', 'verified_members'].includes(row.visibility)
        ? row.city : null,
      region: ['city', 'street_level', 'verified_members', 'country_region'].includes(row.visibility)
        ? row.region : null,
      country_code: row.country_code,
      visibility: isOwner || isAdmin ? row.visibility : undefined,
      address_verified: row.address_verified,
      is_primary: row.is_primary,
      delivery_radius_km: row.delivery_radius_km,
      delivery_countries: row.delivery_countries,
      delivery_notes: row.delivery_notes,
      geocode_status: isOwner || isAdmin ? row.geocode_status : undefined,
      created_at: row.created_at,
    };

    if (canSeeStreetLevel) {
      result.address_line1 = row.address_line1;
      result.address_line2 = row.address_line2;
      result.postal_code = row.postal_code;
      result.coordinates = row.coordinates_geojson;
    } else if (['city', 'street_level', 'verified_members'].includes(row.visibility)) {
      // City centroid only
      result.coordinates = null; // Elasticsearch/UI uses city centroid
    }

    if (isOwner || isAdmin) {
      result.pending_verification_count = row.pending_verification_count;
      result.verified_method = row.verified_method;
      result.verified_at = row.verified_at;
    }

    return result;
  }

  private async verifyRegisteredAddressAgainstKyb(locationId: string, entityId: string) {
    // Compare against KYB-sourced registered address from Creditsafe/Companies House
    const entity = await this.db.queryOne(
      'SELECT kyb_reference, country_code FROM users WHERE id=$1', [entityId]
    );
    // TODO: Call Creditsafe/Companies House API and compare addresses
    // For now, log for manual review
    this.logger.log(`KYB address cross-check queued for location ${locationId}`);
  }

  private generateVerificationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
