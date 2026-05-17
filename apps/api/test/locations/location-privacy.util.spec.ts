import {
  LOCATION_POLICY_VERSION,
  maskCoordinatesForCityLevel,
  normalizeRequestedVisibility,
  requiresDisclosureConsent,
  requiresSoleTraderDisclosureWarning
} from "../../src/common/policies/location-privacy.policy";

describe("location privacy policy", () => {
  it("defaults sole traders to hidden when they do not choose a visibility level", () => {
    expect(normalizeRequestedVisibility("sole_trader", "warehouse", undefined, "hidden")).toBe(
      "hidden"
    );
  });

  it("downgrades sole trader registered offices away from exact street-level visibility", () => {
    expect(
      normalizeRequestedVisibility("sole_trader", "registered", "street_level", "hidden")
    ).toBe("city");
  });

  it("records consent for any disclosed visibility", () => {
    expect(requiresDisclosureConsent("city")).toBe(true);
    expect(requiresDisclosureConsent("hidden")).toBe(false);
    expect(LOCATION_POLICY_VERSION).toBe("location-v4.1");
  });

  it("requires a special warning for sole trader disclosure", () => {
    expect(requiresSoleTraderDisclosureWarning("sole_trader", "city")).toBe(true);
    expect(requiresSoleTraderDisclosureWarning("company", "city")).toBe(false);
  });

  it("masks city-level coordinates to an approximate centroid grid", () => {
    expect(maskCoordinatesForCityLevel(51.92253, 4.47917)).toEqual({
      latitude: 51.9,
      longitude: 4.5
    });
  });
});
