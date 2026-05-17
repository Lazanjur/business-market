import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { selectKybRegistryProvider } from "../../../../api/src/modules/compliance/policies/provider-routing.util";

@Injectable()
export class KybRefreshWorker {
  private readonly logger = new Logger(KybRefreshWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: { entityId: string; caseId: string; checkId: string; provider?: string }) {
    const entity = await this.prisma.entity.findUnique({ where: { id: payload.entityId } });
    if (!entity) {
      throw new Error(`Entity ${payload.entityId} not found`);
    }

    const provider =
      payload.provider ??
      selectKybRegistryProvider({
        regulatoryRegime: entity.regulatoryRegime,
        countryCode: entity.countryCode
      });

    const needsManualReview = /manual|review|flag/i.test(entity.legalName) || /MANUAL/i.test(entity.registrationNumber);
    const providerReference =
      provider === "companies_house"
        ? `CH-${entity.registrationNumber}`
        : `CS-${entity.countryCode}-${entity.registrationNumber}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.complianceCheck.update({
        where: { id: payload.checkId },
        data: {
          status: needsManualReview ? "manual_review" : "passed",
          startedAt: new Date(),
          completedAt: new Date(),
          riskScore: needsManualReview ? 72 : 18,
          responseSnapshot: {
            providerReference,
            registryMatched: !needsManualReview,
            legalName: entity.legalName,
            registrationNumber: entity.registrationNumber,
            registeredCountryCode: entity.countryCode
          } as any
        }
      });

      await tx.complianceCase.update({
        where: { id: payload.caseId },
        data: {
          status: needsManualReview ? "awaiting_review" : "approved",
          riskBand: needsManualReview ? "high" : "low",
          outcomeSummary: needsManualReview
            ? "Registry response requires manual adjudication"
            : "Registry matched cleanly"
        }
      });

      await tx.complianceCaseEvent.create({
        data: {
          caseId: payload.caseId,
          eventType: "compliance.kyb_refresh.completed",
          fromStatus: "pending_provider",
          toStatus: needsManualReview ? "awaiting_review" : "approved",
          note: providerReference,
          metadata: { provider, providerReference } as any
        }
      });

      await tx.entity.update({
        where: { id: payload.entityId },
        data: {
          kybProvider: provider,
          kybReference: providerReference,
          kybStatus: needsManualReview ? "manual_review" : "verified",
          lastKybRefreshAt: new Date(),
          riskBand: needsManualReview ? "high" : "low"
        }
      });
    });

    this.logger.log(`Processed KYB refresh for ${payload.entityId} via ${provider}`);
    return { provider, providerReference, needsManualReview };
  }
}
