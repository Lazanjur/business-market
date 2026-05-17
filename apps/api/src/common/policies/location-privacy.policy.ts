import type { EntityType, LocationType, LocationVisibility } from "@ib-marketplace/shared";

export const LOCATION_POLICY_VERSION = "location-v4.1";

export function normalizeRequestedVisibility(
  entityType: EntityType,
  locationType: LocationType | string,
  requestedVisibility?: LocationVisibility | string | null,
  fallbackVisibility: LocationVisibility = "hidden"
): LocationVisibility {
  const candidate = (requestedVisibility ?? fallbackVisibility) as LocationVisibility;

  if (entityType === "sole_trader" && !requestedVisibility) {
    return "hidden";
  }

  if (
    entityType === "sole_trader" &&
    locationType === "registered" &&
    (candidate === "street_level" || candidate === "verified_members")
  ) {
    return "city";
  }

  return candidate;
}

export function requiresDisclosureConsent(visibility: LocationVisibility) {
  return visibility !== "hidden";
}

export function requiresSoleTraderDisclosureWarning(
  entityType: EntityType,
  visibility: LocationVisibility
) {
  return entityType === "sole_trader" && visibility !== "hidden";
}

export function maskCoordinatesForCityLevel(
  latitude?: number | null,
  longitude?: number | null
): { latitude: number | null; longitude: number | null } {
  if (latitude == null || longitude == null) {
    return { latitude: null, longitude: null };
  }

  return {
    latitude: Number(latitude.toFixed(1)),
    longitude: Number(longitude.toFixed(1))
  };
}
