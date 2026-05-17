export type RegistryProvider = "creditsafe" | "companies_house";
export type IdentityProvider = "onfido" | "manual_admin";
export type ScreeningProvider = "comply_advantage" | "manual_admin";

export function selectKybRegistryProvider(input: {
  regulatoryRegime?: string | null;
  countryCode?: string | null;
}): RegistryProvider {
  if (input.countryCode?.toUpperCase() === "GB" || input.regulatoryRegime === "uk") {
    return "companies_house";
  }
  return "creditsafe";
}

export function selectIdentityProvider(input: {
  entityType?: string | null;
  forceManualReview?: boolean;
}): IdentityProvider {
  if (input.forceManualReview || input.entityType === "public_authority") {
    return "manual_admin";
  }
  return "onfido";
}

export function selectScreeningProvider(input: {
  regulatoryRegime?: string | null;
  forceManualReview?: boolean;
}): ScreeningProvider {
  if (input.forceManualReview) {
    return "manual_admin";
  }
  return "comply_advantage";
}
