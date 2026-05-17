import { serializeLocationForViewer } from "../../src/common/policies/location-visibility.policy";

describe("location visibility serialization", () => {
  const baseLocation = {
    id: "loc_1",
    entityId: "entity_1",
    entityType: "company",
    locationType: "warehouse",
    label: "Main Warehouse",
    addressLine1: "Industrial Way 9",
    city: "Rotterdam",
    region: "Zuid-Holland",
    postalCode: "3000AA",
    countryCode: "NL",
    latitude: 51.92253,
    longitude: 4.47917,
    cityCentroidLat: 51.9,
    cityCentroidLng: 4.5,
    geocodeStatus: "verified",
    visibility: "street_level",
    addressVerified: true,
    isPrimary: true,
    isActive: true
  };

  it("removes exact address precision for basic viewers", () => {
    const result = serializeLocationForViewer(baseLocation as any, {
      userId: "u1",
      role: "buyer",
      verificationTier: "basic"
    } as any);

    expect(result).toMatchObject({
      city: "Rotterdam",
      visibility: "city",
      latitude: 51.9,
      longitude: 4.5
    });
    expect((result as any).addressLine1).toBeUndefined();
  });

  it("keeps exact coordinates for stronger viewers when policy permits", () => {
    const result = serializeLocationForViewer(baseLocation as any, {
      userId: "u2",
      role: "buyer",
      verificationTier: "standard"
    } as any);

    expect(result).toMatchObject({
      addressLine1: "Industrial Way 9",
      latitude: 51.92253,
      longitude: 4.47917,
      visibility: "street_level"
    });
  });
});
