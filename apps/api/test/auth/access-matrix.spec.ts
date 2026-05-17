import { describe, expect, it } from "vitest";
import { hasMinimumVerificationTier } from "@ib-marketplace/shared";
import { hasPermission, resolvePermissions } from "../../../src/modules/auth/policies/access-matrix";

describe("access matrix", () => {
  it("grants owners the entity member management permission", () => {
    const permissions = resolvePermissions({ membershipRole: "owner" });
    expect(permissions).toContain("entity.members.manage");
  });

  it("does not grant viewers the invite permission", () => {
    const permissions = resolvePermissions({ membershipRole: "viewer" });
    expect(hasPermission({ permissions }, "entity.members.invite")).toBe(false);
  });

  it("treats standard tier as sufficient for standard-gated routes", () => {
    expect(hasMinimumVerificationTier("standard", "standard")).toBe(true);
    expect(hasMinimumVerificationTier("basic", "standard")).toBe(false);
  });
});
