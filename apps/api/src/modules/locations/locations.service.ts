import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import type { ViewerContext } from "@ib-marketplace/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { DomainEventsService } from "../../common/infrastructure/domain-events.service";
import { serializeLocation, toLocationContract } from "./serializers/location.serializer";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { NearbySearchDto } from "./dto/nearby-search.dto";
import { MapSearchDto } from "./dto/map-search.dto";
import { canViewerSeeStreetLevel } from "../../common/policies/location-visibility.policy";
import { GeocodingWorker } from "../../workers/geocoding.worker";

function circlePolygon(centerLng: number, centerLat: number, radiusKm: number, points = 64) {
  const earthRadiusKm = 6371;
  const angularDistance = radiusKm / earthRadiusKm;
  const lat = (centerLat * Math.PI) / 180;
  const lng = (centerLng * Math.PI) / 180;
  const coordinates: [number, number][] = [];

  for (let i = 0; i <= points; i += 1) {
    const bearing = (2 * Math.PI * i) / points;
    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(angularDistance) +
        Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLng =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat),
        Math.cos(angularDistance) - Math.sin(lat) * Math.sin(pointLat)
      );
    coordinates.push([(pointLng * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [coordinates]
    },
    properties: {
      type: "delivery_radius",
      radiusKm
    }
  };
}

@Injectable()
export class LocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventsService,
    private readonly geocodingWorker: GeocodingWorker
  ) {}

  private assertEntityScope(entityId: string, viewer: ViewerContext) {
    if (viewer.role === "super_admin") {
      return;
    }

    if (!viewer.entityId || viewer.entityId !== entityId) {
      throw new ForbiddenException("Cross-entity location management is not allowed");
    }
  }

  async findEntityLocations(entityId: string, viewer: ViewerContext) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        locations: {
          where: { isActive: true },
          include: { entity: true },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
        }
      }
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    return entity.locations
      .map((location) => serializeLocation(location, viewer, viewer.entityId === entityId))
      .filter(Boolean);
  }

  async createLocation(entityId: string, dto: CreateLocationDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);

    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    const visibility =
      entity.entityType === "sole_trader" && dto.locationType === "registered"
        ? "hidden"
        : dto.visibility ?? "hidden";

    const shouldBecomePrimary =
      dto.isPrimary ??
      (!(await this.prisma.entityLocation.count({ where: { entityId, isPrimary: true } })) &&
        dto.locationType !== "registered");

    const location = await this.prisma.$transaction(async (tx) => {
      if (shouldBecomePrimary) {
        await tx.entityLocation.updateMany({
          where: { entityId, isPrimary: true },
          data: { isPrimary: false }
        });
      }

      return tx.entityLocation.create({
        data: {
          entityId,
          locationType: dto.locationType,
          label: dto.label,
          addressLine1: dto.addressLine1,
          addressLine2: dto.addressLine2,
          city: dto.city,
          region: dto.region,
          postalCode: dto.postalCode,
          countryCode: dto.countryCode.toUpperCase(),
          deliveryRadiusKm: dto.deliveryRadiusKm,
          deliveryCountries: dto.deliveryCountries?.map((country) => country.toUpperCase()) ?? [],
          deliveryNotes: dto.deliveryNotes,
          visibility,
          isPrimary: shouldBecomePrimary
        },
        include: { entity: true }
      });
    });

    await this.events.publish("location.created", {
      locationId: location.id,
      entityId,
      locationType: location.locationType
    });

    queueMicrotask(() => {
      void this.geocodingWorker.process(location.id);
    });

    return {
      location: serializeLocation(location, viewer, true),
      warnings:
        entity.entityType === "sole_trader" && visibility !== "hidden"
          ? [
              "This entity is marked as a sole trader. Review whether the disclosed address could be a home address before publishing."
            ]
          : []
    };
  }

  async updateLocation(entityId: string, locationId: string, dto: UpdateLocationDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);

    const existing = await this.prisma.entityLocation.findUnique({
      where: { id: locationId },
      include: { entity: true }
    });

    if (!existing || existing.entityId !== entityId || !existing.isActive) {
      throw new NotFoundException("Location not found");
    }

    const addressChanged =
      dto.addressLine1 !== undefined ||
      dto.addressLine2 !== undefined ||
      dto.city !== undefined ||
      dto.region !== undefined ||
      dto.postalCode !== undefined ||
      dto.countryCode !== undefined;

    const location = await this.prisma.entityLocation.update({
      where: { id: locationId },
      data: {
        label: dto.label ?? existing.label,
        addressLine1: dto.addressLine1 ?? existing.addressLine1,
        addressLine2: dto.addressLine2 ?? existing.addressLine2,
        city: dto.city ?? existing.city,
        region: dto.region ?? existing.region,
        postalCode: dto.postalCode ?? existing.postalCode,
        countryCode: dto.countryCode?.toUpperCase() ?? existing.countryCode,
        deliveryRadiusKm: dto.deliveryRadiusKm ?? existing.deliveryRadiusKm,
        deliveryCountries: dto.deliveryCountries?.map((country) => country.toUpperCase()) ?? existing.deliveryCountries,
        deliveryNotes: dto.deliveryNotes ?? existing.deliveryNotes,
        visibility: dto.visibility ?? existing.visibility,
        addressVerified: addressChanged ? false : existing.addressVerified,
        verifiedMethod: addressChanged ? null : existing.verifiedMethod,
        verifiedAt: addressChanged ? null : existing.verifiedAt,
        geocodeStatus: addressChanged ? "pending" : existing.geocodeStatus
      },
      include: { entity: true }
    });

    if (dto.visibility && dto.visibility !== existing.visibility) {
      await this.prisma.locationHistory.create({
        data: {
          locationId,
          changedBy: viewer.userId,
          fieldChanged: "visibility",
          oldValue: existing.visibility,
          newValue: dto.visibility,
          changeReason: "User changed privacy setting"
        }
      });

      await this.events.publish("location.visibility_changed", {
        locationId,
        entityId,
        oldValue: existing.visibility,
        newValue: dto.visibility
      });
    }

    if (addressChanged) {
      queueMicrotask(() => {
        void this.geocodingWorker.process(location.id);
      });
    }

    return serializeLocation(location, viewer, true);
  }

  async deleteLocation(entityId: string, locationId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);

    const location = await this.prisma.entityLocation.findUnique({ where: { id: locationId } });
    if (!location || location.entityId !== entityId) {
      throw new NotFoundException("Location not found");
    }

    await this.prisma.entityLocation.update({
      where: { id: locationId },
      data: { isActive: false, isPrimary: false }
    });

    await this.prisma.locationHistory.create({
      data: {
        locationId,
        changedBy: viewer.userId,
        fieldChanged: "is_active",
        oldValue: "true",
        newValue: "false",
        changeReason: "Soft deleted by entity admin"
      }
    });

    return { success: true };
  }

  async setPrimary(entityId: string, locationId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);

    const location = await this.prisma.entityLocation.findUnique({ where: { id: locationId } });
    if (!location || location.entityId !== entityId || !location.isActive) {
      throw new NotFoundException("Location not found");
    }

    await this.prisma.$transaction([
      this.prisma.entityLocation.updateMany({
        where: { entityId, isPrimary: true },
        data: { isPrimary: false }
      }),
      this.prisma.entityLocation.update({
        where: { id: locationId },
        data: { isPrimary: true }
      })
    ]);

    return { success: true };
  }

  async requestPostcardVerification(entityId: string, locationId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);

    const location = await this.prisma.entityLocation.findUnique({ where: { id: locationId } });
    if (!location || location.entityId !== entityId || !location.isActive) {
      throw new NotFoundException("Location not found");
    }

    if (!["warehouse", "delivery_hub", "operational_hq", "branch_office", "showroom"].includes(location.locationType)) {
      throw new BadRequestException("Postcard verification is not supported for this location type");
    }

    const plainCode = randomBytes(4).toString("hex").toUpperCase();
    const verificationCode = await bcrypt.hash(plainCode, 10);

    const request = await this.prisma.locationVerificationRequest.create({
      data: {
        locationId,
        method: "postcard",
        verificationCode,
        status: "sent",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    await this.events.publish("location.verification_requested", {
      locationId,
      requestId: request.id,
      method: "postcard"
    });

    return {
      requestId: request.id,
      devPreviewCode: process.env.NODE_ENV !== "production" ? plainCode : undefined
    };
  }

  async confirmPostcard(entityId: string, locationId: string, code: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);

    const request = await this.prisma.locationVerificationRequest.findFirst({
      where: {
        locationId,
        method: "postcard",
        status: { in: ["sent", "entered", "pending"] }
      },
      orderBy: { createdAt: "desc" }
    });

    if (!request || (request.expiresAt && request.expiresAt < new Date())) {
      throw new BadRequestException("No active postcard verification found");
    }

    const matches = await bcrypt.compare(code, request.verificationCode ?? "");
    if (!matches) {
      throw new BadRequestException("Invalid verification code");
    }

    await this.prisma.$transaction([
      this.prisma.locationVerificationRequest.update({
        where: { id: request.id },
        data: { status: "approved", resolvedAt: new Date() }
      }),
      this.prisma.entityLocation.update({
        where: { id: locationId },
        data: {
          addressVerified: true,
          verifiedMethod: "postcard",
          verifiedAt: new Date()
        }
      })
    ]);

    await this.events.publish("location.verified", {
      locationId,
      method: "postcard"
    });

    return { success: true };
  }

  async requestDocumentVerification(entityId: string, locationId: string, viewer: ViewerContext, documentUrl: string) {
    this.assertEntityScope(entityId, viewer);

    const location = await this.prisma.entityLocation.findUnique({ where: { id: locationId } });
    if (!location || location.entityId !== entityId || !location.isActive) {
      throw new NotFoundException("Location not found");
    }

    return this.prisma.locationVerificationRequest.create({
      data: {
        locationId,
        method: "document_upload",
        documentUrl,
        status: "pending"
      }
    });
  }

  async searchNearby(dto: NearbySearchDto, viewer: ViewerContext) {
    const streetLevelAllowed = canViewerSeeStreetLevel(viewer.verificationTier);
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        entity_id: string;
        legal_name: string;
        location_id: string;
        location_type: string;
        city: string;
        region: string | null;
        country_code: string;
        latitude: number;
        longitude: number;
        visibility: string;
        trust_score: number;
        distance_km: number;
      }>
    >(
      `
      SELECT
        e.id AS entity_id,
        e.legal_name,
        l.id AS location_id,
        l.location_type,
        l.city,
        l.region,
        l.country_code,
        CAST(l.latitude AS float) AS latitude,
        CAST(l.longitude AS float) AS longitude,
        l.visibility,
        e.trust_score,
        ROUND(CAST(ST_Distance(
          l.coordinates,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 AS numeric), 2) AS distance_km
      FROM entity_locations l
      JOIN entities e ON e.id = l.entity_id
      WHERE l.is_active = TRUE
        AND l.address_verified = TRUE
        AND l.coordinates IS NOT NULL
        AND ST_DWithin(
          l.coordinates,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
        AND (
          l.visibility IN ('country_region', 'city')
          OR ($4 = TRUE AND l.visibility IN ('street_level', 'verified_members'))
        )
      ORDER BY distance_km ASC
      LIMIT 200
      `,
      dto.lng,
      dto.lat,
      dto.radiusKm * 1000,
      streetLevelAllowed
    );

    return rows
      .filter((row) => (dto.locationType ? row.location_type === dto.locationType : true))
      .filter((row) =>
        dto.countryCode ? row.country_code === dto.countryCode.toUpperCase() : true
      )
      .map((row) => ({
        entityId: row.entity_id,
        entityName: row.legal_name,
        locationId: row.location_id,
        locationType: row.location_type,
        city: row.city,
        region: row.region,
        countryCode: row.country_code,
        lat: row.latitude,
        lng: row.longitude,
        visibility: row.visibility,
        trustScore: row.trust_score,
        distanceKm: row.distance_km
      }));
  }

  async mapSearch(dto: MapSearchDto, viewer: ViewerContext) {
    const streetLevelAllowed = canViewerSeeStreetLevel(viewer.verificationTier);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        entity_id: string;
        legal_name: string;
        location_id: string;
        location_type: string;
        city: string;
        region: string | null;
        country_code: string;
        latitude: number;
        longitude: number;
        visibility: string;
        trust_score: number;
      }>
    >(
      `
      SELECT
        e.id AS entity_id,
        e.legal_name,
        l.id AS location_id,
        l.location_type,
        l.city,
        l.region,
        l.country_code,
        CAST(l.latitude AS float) AS latitude,
        CAST(l.longitude AS float) AS longitude,
        l.visibility,
        e.trust_score
      FROM entity_locations l
      JOIN entities e ON e.id = l.entity_id
      WHERE l.is_active = TRUE
        AND l.address_verified = TRUE
        AND l.coordinates IS NOT NULL
        AND ST_Within(
          l.coordinates::geometry,
          ST_MakeEnvelope($1, $2, $3, $4, 4326)
        )
        AND (
          l.visibility IN ('country_region', 'city')
          OR ($5 = TRUE AND l.visibility IN ('street_level', 'verified_members'))
        )
      LIMIT 1000
      `,
      dto.swLng,
      dto.swLat,
      dto.neLng,
      dto.neLat,
      streetLevelAllowed
    );

    return rows
      .filter((row) =>
        dto.countryCode ? row.country_code === dto.countryCode.toUpperCase() : true
      )
      .map((row) => ({
        entityId: row.entity_id,
        entityName: row.legal_name,
        locationId: row.location_id,
        locationType: row.location_type,
        city: row.city,
        region: row.region,
        countryCode: row.country_code,
        lat: row.latitude,
        lng: row.longitude,
        visibility: row.visibility,
        trustScore: row.trust_score
      }));
  }

  async getDeliveryCoverage(listingId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: { dispatchLocation: true }
    });

    if (!listing?.dispatchLocation) {
      throw new NotFoundException("Listing or dispatch location not found");
    }

    const location = listing.dispatchLocation;
    if (!location.deliveryRadiusKm || !location.latitude || !location.longitude) {
      return null;
    }

    return circlePolygon(Number(location.longitude), Number(location.latitude), location.deliveryRadiusKm);
  }

  async buildInvestBusinessLocationPayload(entityId: string) {
    const location = await this.prisma.entityLocation.findFirst({
      where: { entityId, isPrimary: true, isActive: true },
      orderBy: { createdAt: "asc" }
    });

    if (!location) {
      return { primaryLocationCity: null, primaryLocationCountry: null };
    }

    const contract = toLocationContract(location);
    return {
      primaryLocationCity: contract.city,
      primaryLocationCountry: contract.countryCode
    };
  }
}
