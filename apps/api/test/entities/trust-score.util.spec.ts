import { describe, expect, it } from "vitest";
import { calculateTrustScore } from "../../../src/modules/entities/scoring/trust-score.util";

describe("calculateTrustScore", () => {
  it("rewards verified, well-governed entities", () => {
    const result = calculateTrustScore({
      kybStatus: "verified",
      verificationTier: "premium",
      entityType: "private_company",
      profileCompletenessScore: 88,
      verifiedCertificationsCount: 3,
      activeMembershipCount: 4,
      verifiedLocationsCount: 2
    });

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.breakdown.some((item) => item.label === "KYB verified")).toBe(true);
  });

  it("adds an uplift for configured authority governance", () => {
    const withoutAuthority = calculateTrustScore({
      kybStatus: "verified",
      verificationTier: "public_authority",
      entityType: "public_authority",
      profileCompletenessScore: 80,
      authorityProfileConfigured: false
    });

    const withAuthority = calculateTrustScore({
      kybStatus: "verified",
      verificationTier: "public_authority",
      entityType: "public_authority",
      profileCompletenessScore: 80,
      authorityProfileConfigured: true
    });

    expect(withAuthority.score).toBeGreaterThan(withoutAuthority.score);
  });
});
