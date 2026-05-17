import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../api/src/prisma/prisma.service";
import { calculateProfileCompleteness } from "../../../../api/src/modules/entities/scoring/profile-completeness.util";
import { calculateTrustScore } from "../../../../api/src/modules/entities/scoring/trust-score.util";

@Injectable()
export class TrustScoreWorker {
  private readonly logger = new Logger(TrustScoreWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: { entityId: string; source?: string }) {
    const [entity, profile, certifications, memberships, locations, authorityProfile] = await Promise.all([
      this.prisma.entity.findUnique({ where: { id: payload.entityId } }),
      this.prisma.entityProfile.findUnique({ where: { entityId: payload.entityId } }),
      this.prisma.entityCertification.findMany({ where: { entityId: payload.entityId } }),
      this.prisma.entityMembership.findMany({ where: { entityId: payload.entityId, status: "active" } }),
      this.prisma.entityLocation.findMany({ where: { entityId: payload.entityId, isActive: true, addressVerified: true } }),
      this.prisma.entityAuthorityProfile.findUnique({ where: { entityId: payload.entityId } })
    ]);

    if (!entity) {
      return null;
    }

    const completeness = calculateProfileCompleteness(profile);
    const result = calculateTrustScore({
      currentTrustScore: entity.trustScore,
      kybStatus: entity.kybStatus,
      verificationTier: entity.verificationTier,
      entityType: entity.entityType,
      profileCompletenessScore: completeness.score,
      verifiedCertificationsCount: certifications.filter((item) => item.status === "verified").length,
      activeMembershipCount: memberships.length,
      verifiedLocationsCount: locations.length,
      authorityProfileConfigured: Boolean(authorityProfile)
    });

    if (result.score === entity.trustScore) {
      return { changed: false, score: result.score };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.entity.update({
        where: { id: payload.entityId },
        data: { trustScore: result.score }
      });

      await tx.trustScoreEvent.create({
        data: {
          entityId: payload.entityId,
          source: payload.source ?? "worker_recalculation",
          reason: "Background entity governance recalculation",
          delta: result.score - entity.trustScore,
          scoreBefore: entity.trustScore,
          scoreAfter: result.score,
          metadata: { breakdown: result.breakdown }
        }
      });
    });

    this.logger.log(`Entity ${payload.entityId} trust score recalculated ${entity.trustScore} -> ${result.score}`);
    return { changed: true, score: result.score };
  }
}
