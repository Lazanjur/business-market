import { calculateSecurityPostureScore, requiresProductionBlocker } from "../../src/modules/security/policies/security-baseline.util";

describe("security-baseline.util", () => {
  it("calculates a posture score", () => {
    expect(calculateSecurityPostureScore(["implemented", "planned", "missing"])).toBe(50);
  });

  it("detects a production blocker", () => {
    expect(requiresProductionBlocker(["implemented", "missing"])).toBe(true);
  });
});
