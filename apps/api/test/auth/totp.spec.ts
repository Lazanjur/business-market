import { describe, expect, it } from "vitest";
import {
  buildOtpAuthUrl,
  generateTotpToken,
  verifyTotp
} from "../../../src/modules/auth/utils/totp";

describe("totp utilities", () => {
  it("verifies a current-step TOTP", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const timestamp = 1_710_000_000_000;
    const token = generateTotpToken(secret, timestamp);
    expect(verifyTotp(secret, token, 1, timestamp)).toBe(true);
  });

  it("builds an otpauth uri", () => {
    const uri = buildOtpAuthUrl({
      issuer: "IB Marketplace",
      accountName: "owner@example.com",
      secret: "JBSWY3DPEHPK3PXP"
    });
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("issuer=IB%20Marketplace");
  });
});
