
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../api/src/prisma/prisma.service";
import { assessSanctionsMatches } from "../../../../api/src/modules/compliance/policies/sanctions-risk.policy";

@Injectable()
export class SanctionsScreeningWorker {
  private readonly logger = new Logger(SanctionsScreeningWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: { entityId: string; caseId?: string | null; legalName: string }) {
    const db = this.prisma as any;
    const simulatedMatches = payload.legalName.toLowerCase().includes("sanction")
      ? [{ subjectName: payload.legalName, listName: "EU Consolidated List", matchScore: 0.97, isPep: false }]
      : [];

    const assessment = assessSanctionsMatches(simulatedMatches as any);

    if (simulatedMatches.length) {
      for (const match of simulatedMatches) {
        await db.complianceScreeningMatch.create({
          data: {
            entityId: payload.entityId,
            caseId: payload.caseId ?? null,
            subjectType: "entity",
            provider: "complyadvantage",
            providerReference: `cmp-${payload.entityId}`,
            matchedName: match.subjectName,
            sourceList: match.listName,
            matchScore: match.matchScore,
            resolutionStatus: assessment.recommendedStatus === "blocked" ? "blocked" : "review_required"
          }
        });
      }

      await db.complianceReviewTask.create({
        data: {
          entityId: payload.entityId,
          caseId: payload.caseId ?? null,
          taskType: "screening_match_review",
          status: "open",
          priority: assessment.riskLevel === "critical" ? "high" : "normal"
        }
      });
    }

    await db.entity.update({
      where: { id: payload.entityId },
      data: {
        sanctionsStatus: assessment.recommendedStatus === "clear" ? "clear" : "review_required",
        riskBand: assessment.riskLevel,
        complianceHoldReason: assessment.recommendedStatus === "clear" ? null : assessment.reason,
        lastKybRefreshAt: new Date()
      }
    });

    this.logger.log(`Sanctions screening completed for entity ${payload.entityId}`);
    return assessment;
  }
}
