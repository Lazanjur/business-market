import type {
  EntityType,
  LocationContract,
  LocationVisibility,
  VerificationTier,
  ViewerContext
} from "@ib-marketplace/shared";
import {
  maskCoordinatesForCityLevel,
  normalizeRequestedVisibility
} from "./location-privacy.policy";

const tierOrder: Record<VerificationTier, number> = {
  basic: 1,
  standard: 2,
  premium: 3,
  public_authority: 4
};

export function canViewerSeeStreetLevel(tier: VerificationTier): boolean {
  return tierOrder[tier] >= tierOrder.standard;
}

export function getEffectiveVisibility(
  entityType: EntityType,
  locationType: string,
  visibility: LocationVisibility
): LocationVisibility {
  return normalizeRequestedVisibility(entityType, locationType, visibility, visibility);
}

export function serializeLocationForViewer(
  location: LocationContract,
  viewer: ViewerContext,
  selfView = false
) {
  const effectiveVisibility = getEffectiveVisibility(
    (location.entityType ?? "company") as EntityType,
    location.locationType,
    location.visibility
  );

  const isSameEntity = !!viewer.entityId && viewer.entityId === location.entityId;

  if (selfView || isSameEntity) {
    return location;
  }

  if (effectiveVisibility === "hidden") {
    return null;
  }

  if (
    (effectiveVisibility === "street_level" || effectiveVisibility === "verified_members") &&
    !canViewerSeeStreetLevel(viewer.verificationTier)
  ) {
    const masked = maskCoordinatesForCityLevel(location.cityCentroidLat ?? location.latitude, location.cityCentroidLng ?? location.longitude);

    return {
      id: location.id,
      entityId: location.entityId,
      locationType: location.locationType,
      label: location.label,
      city: location.city,
      region: location.region,
      countryCode: location.countryCode,
      latitude: masked.latitude,
      longitude: masked.longitude,
      visibility: "city" as const,
      addressVerified: location.addressVerified,
      isPrimary: location.isPrimary,
      isActive: location.isActive,
      geocodeStatus: location.geocodeStatus
    };
  }

  if (effectiveVisibility === "country_region") {
    return {
      id: location.id,
      entityId: location.entityId,
      locationType: location.locationType,
      label: location.label,
      region: location.region,
      countryCode: location.countryCode,
      visibility: effectiveVisibility,
      addressVerified: location.addressVerified,
      isPrimary: location.isPrimary,
      isActive: location.isActive,
      geocodeStatus: location.geocodeStatus
    };
  }

  if (effectiveVisibility === "city") {
    const masked = maskCoordinatesForCityLevel(location.cityCentroidLat ?? location.latitude, location.cityCentroidLng ?? location.longitude);

    return {
      id: location.id,
      entityId: location.entityId,
      locationType: location.locationType,
      label: location.label,
      city: location.city,
      region: location.region,
      countryCode: location.countryCode,
      latitude: masked.latitude,
      longitude: masked.longitude,
      visibility: effectiveVisibility,
      addressVerified: location.addressVerified,
      isPrimary: location.isPrimary,
      isActive: location.isActive,
      geocodeStatus: location.geocodeStatus
    };
  }

  return location;
}
