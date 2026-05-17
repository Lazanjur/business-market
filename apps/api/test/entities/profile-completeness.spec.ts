import { describe, expect, it } from "vitest";
import { calculateProfileCompleteness } from "../../../src/modules/entities/scoring/profile-completeness.util";

describe("calculateProfileCompleteness", () => {
  it("returns 0 for missing profile data", () => {
    const result = calculateProfileCompleteness(undefined);
    expect(result.score).toBe(0);
    expect(result.missingFields.length).toBeGreaterThan(5);
  });

  it("reaches a high score for publish-ready entity profiles", () => {
    const result = calculateProfileCompleteness({
      displayName: "Alpine Components Europe",
      description: "Precision industrial components for EU and UK buyers.",
      websiteUrl: "https://alpine-components.eu",
      supportEmail: "support@alpine-components.eu",
      phoneNumber: "+31 10 555 0101",
      yearFounded: 2012,
      employeeRange: "50-249",
      annualRevenueBand: "10m-50m",
      coverageCountries: ["NL", "BE", "DE"],
      supportedLanguages: ["en", "nl", "de"],
      capabilities: ["cnc", "assembly", "rapid-response"],
      profileStatus: "published"
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.missingFields).toHaveLength(0);
  });
});
