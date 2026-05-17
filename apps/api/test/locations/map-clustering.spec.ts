import { clusterSupplierPins } from "../../src/modules/locations/policies/map-clustering.util";

describe("map clustering", () => {
  it("clusters dense viewport pins into a single aggregated marker", () => {
    const pins = Array.from({ length: 30 }).map((_, index) => ({
      entityId: `ent_${index}`,
      entityName: `Entity ${index}`,
      locationId: `loc_${index}`,
      locationType: "warehouse" as const,
      city: "Rotterdam",
      region: "Zuid-Holland",
      countryCode: "NL",
      lat: 51.92 + index * 0.001,
      lng: 4.47 + index * 0.001,
      visibility: "city" as const
    }));

    const clustered = clusterSupplierPins(pins, {
      swLat: 51.5,
      swLng: 4.0,
      neLat: 52.5,
      neLng: 5.0
    });

    expect(clustered.clusters.length).toBeGreaterThan(0);
    expect(clustered.pins.length + clustered.clusters.length).toBeLessThan(pins.length);
    expect(clustered.clusters[0].count).toBeGreaterThan(1);
  });
});
