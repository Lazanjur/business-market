import { BadRequestException, Injectable } from "@nestjs/common";
import { DomainEventsService } from "../../common/infrastructure/domain-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  buildOtpAuthUrl,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotp
} from "./utils/totp";

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventsService
  ) {}

  async hasVerifiedMethod(userId: string) {
    const count = await this.prisma.userMfaMethod.count({
      where: {
        userId,
        isVerified: true
      }
    });
    return count > 0;
  }

  async startTotpEnrollment(userId: string, email: string, label?: string) {
    const secret = generateTotpSecret();
    const method = await this.prisma.userMfaMethod.create({
      data: {
        userId,
        method: "totp",
        label,
        secretEncrypted: encryptSecret(secret),
        isPrimary: !(await this.hasVerifiedMethod(userId))
      }
    });

    return {
      methodId: method.id,
      secret,
      otpauthUrl: buildOtpAuthUrl({
        issuer: "IB Marketplace",
        accountName: email,
        secret
      })
    };
  }

  async verifyEnrollment(userId: string, methodId: string, code: string) {
    const method = await this.prisma.userMfaMethod.findUnique({ where: { id: methodId } });
    if (!method || method.userId !== userId || method.method !== "totp" || !method.secretEncrypted) {
      throw new BadRequestException("TOTP method not found");
    }

    const secret = decryptSecret(method.secretEncrypted);
    if (!verifyTotp(secret, code)) {
      throw new BadRequestException("Invalid authenticator code");
    }

    const recoveryCodes = generateRecoveryCodes();

    await this.prisma.userMfaMethod.update({
      where: { id: methodId },
      data: {
        isVerified: true,
        backupCodeHashes: recoveryCodes.hashes,
        lastUsedAt: new Date()
      }
    });

    await this.events.publish(
      "auth.mfa_enabled",
      { userId, methodId, method: "totp" },
      { aggregateType: "user", aggregateId: userId }
    );

    return {
      success: true,
      recoveryCodes: recoveryCodes.plain
    };
  }

  async verifyChallenge(userId: string, code: string) {
    const methods = await this.prisma.userMfaMethod.findMany({
      where: { userId, isVerified: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
    });

    for (const method of methods) {
      if (method.method === "totp" && method.secretEncrypted) {
        const secret = decryptSecret(method.secretEncrypted);
        if (verifyTotp(secret, code)) {
          await this.prisma.userMfaMethod.update({
            where: { id: method.id },
            data: { lastUsedAt: new Date() }
          });
          return true;
        }
      }

      const hashedCode = hashRecoveryCode(code.toUpperCase());
      if (method.backupCodeHashes.includes(hashedCode)) {
        await this.prisma.userMfaMethod.update({
          where: { id: method.id },
          data: {
            backupCodeHashes: method.backupCodeHashes.filter((entry) => entry !== hashedCode),
            lastUsedAt: new Date()
          }
        });
        return true;
      }
    }

    return false;
  }
}
