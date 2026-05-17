
import { describe, expect, it } from "vitest";
import {
  buildComplianceCasePlan,
  buildNextReverificationDate,
  determineVerificationTier,
  simulateRegistryLookup,
  simulateSanctionsScreening
} from "@ib-marketplace/shared";

describe("shared compliance policy", () => {
  it("builds a premium EU case plan with enhanced checks", () => {
    const plan = buildComplianceCasePlan({
      targetTier: "premium",
      regulatoryRegime: "eu",
      entityType: "company"
    });

    expect(plan.registryProvider).toBe("creditsafe");
    expect(plan.requiredChecks).toContain("beneficial_owner");
    expect(plan.requiredChecks).toContain("sanctions");
    expect(plan.requiredDocuments).toContain("director_identity");
  });

  it("keeps a non-approved case from silently upgrading tier", () => {
    expect(
      determineVerificationTier({
        targetTier: "premium",
        caseStatus: "awaiting_documents" as any,
        entityType: "company"
      })
    ).toBe("basic");
  });

  it("uses a shorter reverification cycle for UK premium entities", () => {
    const start = new Date("2026-04-10T00:00:00.000Z");
    const next = buildNextReverificationDate("premium", "uk", start);
    expect(next.toISOString().slice(0, 10)).toBe("2026-09-07");
  });

  it("simulates registry and screening providers deterministically", () => {
    const registry = simulateRegistryLookup({
      provider: "companies_house",
      legalName: "UK Marine Components Ltd",
      registrationNumber: "12345678",
      countryCode: "GB"
    });
    const screening = simulateSanctionsScreening({
      subjectName: "Blocked Holdings Ltd",
      countryCode: "GB",
      scope: "entity"
    });

    expect(registry.provider).toBe("companies_house");
    expect(registry.providerReference).toContain("companies_house_");
    expect(screening.status).toBe("potential_match");
    expect(screening.hits.length).toBeGreaterThan(0);
  });
});
