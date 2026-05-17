
import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type {
  BeneficialOwnerInput,
  ComplianceCaseType,
  VerificationTier,
  ViewerContext
} from "@ib-marketplace/shared";
import { DomainEventsService } from "../../common/infrastructure/domain-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AccessControlService } from "../../common/auth/access-control.service";
import { StartComplianceCaseDto } from "./dto/start-compliance-case.dto";
import { SubmitBeneficialOwnersDto } from "./dto/submit-beneficial-owners.dto";
import { RequestReverificationDto } from "./dto/request-reverification.dto";
import { ResolveReviewTaskDto } from "./dto/resolve-review-task.dto";
import { buildComplianceExecutionPlan } from "./policies/provider-routing.policy";
import { assessSanctionsMatches } from "./policies/sanctions-risk.policy";

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(" ") || parts[0] || fullName
  };
}

function normaliseName(fullName: string) {
  return fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventsService,
    private readonly access: AccessControlService
  ) {}

  private db() {
    return this.prisma as any;
  }

  private assertEntityScope(entityId: string, viewer: ViewerContext) {
    if (viewer.role === "super_admin" || viewer.role === "platform_ops") {
      return;
    }

    if (!viewer.entityId || viewer.entityId !== entityId) {
      throw new ForbiddenException("Cross-entity compliance access is not allowed");
    }
  }

  private async getEntityOrFail(entityId: string) {
    const entity = await this.db().entity.findUnique({ where: { id: entityId } });
    if (!entity) {
      throw new NotFoundException("Entity not found");
    }
    return entity;
  }

  async getWorkspace(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_compliance_cases", entityId);

    const entity = await this.getEntityOrFail(entityId);
    const [cases, tasks, owners, documents, matches] = await Promise.all([
      this.db().complianceCase.findMany({
        where: { entityId },
        orderBy: [{ createdAt: "desc" }],
        take: 12,
        include: { checks: true, documents: true, screeningMatches: true, events: true }
      }),
      this.db().complianceReviewTask.findMany({
        where: { entityId },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 20
      }),
      this.db().beneficialOwner.findMany({
        where: { entityId, isActive: true },
        orderBy: [{ ownershipPercent: "desc" }, { lastName: "asc" }]
      }),
      this.db().complianceDocument.findMany({
        where: { entityId },
        orderBy: [{ createdAt: "desc" }],
        take: 20
      }),
      this.db().complianceScreeningMatch.findMany({
        where: { entityId },
        orderBy: [{ createdAt: "desc" }],
        take: 10
      })
    ]);

    const openCases = cases.filter((item: any) => ["open", "in_review", "pending_user", "escalated"].includes(item.status));
    const blockingTasks = tasks.filter((item: any) => item.status !== "resolved");

    return {
      entity: {
        id: entity.id,
        legalName: entity.legalName,
        countryCode: entity.countryCode,
        regulatoryRegime: entity.regulatoryRegime,
        entityType: entity.entityType,
        kybStatus: entity.kybStatus,
        verificationTier: entity.verificationTier,
        kybProvider: entity.kybProvider ?? null,
        kybReference: entity.kybReference ?? null,
        sanctionsStatus: entity.sanctionsStatus,
        riskBand: entity.riskBand,
        complianceHoldReason: entity.complianceHoldReason ?? null,
        uboDeclarationStatus: entity.uboDeclarationStatus,
        lastKybRefreshAt: entity.lastKybRefreshAt ?? null
      },
      summary: {
        openCases: openCases.length,
        blockingTasks: blockingTasks.length,
        beneficialOwnersDeclared: owners.length,
        verifiedDocuments: documents.filter((item: any) => item.status === "verified").length,
        unresolvedMatches: matches.filter((item: any) => item.resolutionStatus !== "cleared").length
      },
      cases,
      reviewTasks: tasks,
      beneficialOwners: owners,
      documents,
      screeningMatches: matches
    };
  }

  async listCases(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_compliance_cases", entityId);

    return this.db().complianceCase.findMany({
      where: { entityId },
      include: { checks: true, documents: true, screeningMatches: true, events: true, reviewTasks: true },
      orderBy: [{ createdAt: "desc" }]
    });
  }

  async getCase(entityId: string, caseId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_compliance_cases", entityId);

    const record = await this.db().complianceCase.findUnique({
      where: { id: caseId },
      include: { checks: true, documents: true, screeningMatches: true, events: true, reviewTasks: true }
    });

    if (!record || record.entityId !== entityId) {
      throw new NotFoundException("Compliance case not found");
    }

    return record;
  }

  async startCase(entityId: string, dto: StartComplianceCaseDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_compliance_cases", entityId);
    const entity = await this.getEntityOrFail(entityId);

    const plan = buildComplianceExecutionPlan({
      countryCode: entity.countryCode,
      regulatoryRegime: entity.regulatoryRegime,
      caseType: dto.caseType,
      targetTier: dto.verificationTierTarget,
      entityType: entity.entityType
    });

    const created = await this.db().$transaction(async (tx: any) => {
      const complianceCase = await tx.complianceCase.create({
        data: {
          entityId,
          caseType: dto.caseType,
          status: "open",
          riskBand: plan.riskLevel,
          priority: plan.riskLevel === "high" || plan.riskLevel === "critical" ? "high" : "normal",
          initiatedBy: viewer.userId,
          externalReference: `${entity.countryCode}:${dto.caseType}:${dto.verificationTierTarget}`,
          outcomeSummary: dto.justification ?? null,
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null
        }
      });

      await tx.complianceCheck.createMany({
        data: plan.steps.map((step) => ({
          entityId,
          caseId: complianceCase.id,
          provider: step.provider,
          checkType: step.checkType,
          status: "queued",
          requestSnapshot: {
            blocking: step.blocking,
            reason: step.reason,
            targetTier: dto.verificationTierTarget
          }
        }))
      });

      await tx.complianceReviewTask.create({
        data: {
          entityId,
          caseId: complianceCase.id,
          taskType: dto.caseType === "manual_review" ? "manual_review" : "case_triage",
          status: "open",
          priority: plan.riskLevel === "high" || plan.riskLevel === "critical" ? "high" : "normal",
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null
        }
      });

      await tx.complianceCaseEvent.create({
        data: {
          caseId: complianceCase.id,
          actorUserId: viewer.userId,
          eventType: "compliance.case.created",
          toStatus: "open",
          note: dto.justification ?? null,
          metadata: { plan }
        }
      });

      await tx.entity.update({
        where: { id: entityId },
        data: {
          kybProvider: plan.kybProvider,
          riskBand: plan.riskLevel,
          kybStatus: "manual_review"
        }
      });

      return complianceCase;
    });

    await this.events.publish("compliance.case.created", {
      entityId,
      caseId: created.id,
      caseType: dto.caseType,
      targetTier: dto.verificationTierTarget,
      regulatoryRegime: entity.regulatoryRegime,
      countryCode: entity.countryCode,
      riskLevel: plan.riskLevel
    });

    return { case: created, plan };
  }

  async submitBeneficialOwners(entityId: string, dto: SubmitBeneficialOwnersDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_compliance_cases", entityId);
    await this.getEntityOrFail(entityId);

    const owners = (dto.owners ?? []).map((owner: BeneficialOwnerInput) => {
      const names = splitFullName(owner.fullName);
      return {
        entityId,
        firstName: names.firstName,
        lastName: names.lastName,
        fullNameNormalized: normaliseName(owner.fullName),
        nationalityCountryCode: owner.countryCode ?? null,
        residenceCountryCode: owner.countryCode ?? null,
        ownershipPercent: owner.ownershipPercent ?? null,
        controlType: owner.isControlPerson ? "control_person" : "shareholder",
        roleTitle: owner.jobTitle ?? null,
        identityVerificationStatus: owner.identityStatus ?? "pending",
        screeningStatus: owner.isPep ? "review_required" : "queued",
        pepDeclared: owner.isPep ?? false,
        sanctionsDeclared: false,
        isActive: true
      };
    });

    await this.db().$transaction(async (tx: any) => {
      await tx.beneficialOwner.updateMany({ where: { entityId }, data: { isActive: false } });
      if (owners.length) {
        await tx.beneficialOwner.createMany({ data: owners });
      }
      await tx.entity.update({
        where: { id: entityId },
        data: { uboDeclarationStatus: owners.length ? "submitted" : "not_started" }
      });
      await tx.complianceReviewTask.create({
        data: {
          entityId,
          taskType: "beneficial_owner_review",
          status: "open",
          priority: owners.some((owner: any) => owner.pepDeclared) ? "high" : "normal"
        }
      });
    });

    await this.events.publish("compliance.owners.updated", {
      entityId,
      ownersCount: owners.length,
      containsPep: owners.some((owner) => owner.pepDeclared)
    });

    return {
      entityId,
      ownersDeclared: owners.length,
      reviewRequired: owners.some((owner) => owner.pepDeclared)
    };
  }

  async runSanctionsScreening(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_compliance_cases", entityId);
    const entity = await this.getEntityOrFail(entityId);

    const activeCase = await this.db().complianceCase.findFirst({
      where: { entityId, status: { in: ["open", "in_review", "pending_user"] } },
      orderBy: [{ createdAt: "desc" }]
    });

    await this.events.publish("compliance.sanctions.refresh.requested", {
      entityId,
      caseId: activeCase?.id ?? null,
      legalName: entity.legalName,
      countryCode: entity.countryCode,
      regulatoryRegime: entity.regulatoryRegime
    });

    return {
      entityId,
      caseId: activeCase?.id ?? null,
      queued: true,
      provider: "complyadvantage"
    };
  }

  async requestReverification(entityId: string, dto: RequestReverificationDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_compliance_cases", entityId);

    const result = await this.startCase(entityId, {
      caseType: "reverification" as ComplianceCaseType,
      verificationTierTarget: dto.targetTier ?? ("standard" as VerificationTier),
      justification: dto.reason,
      dueAt: dto.dueAt
    }, viewer);

    await this.events.publish("compliance.reverification.requested", {
      entityId,
      caseId: result.case.id,
      includeSanctionsRefresh: dto.includeSanctionsRefresh,
      reason: dto.reason
    });

    return result;
  }

  async listReviewQueue(viewer: ViewerContext) {
    this.access.assertCapability(viewer, "view_audit_logs");

    return this.db().complianceReviewTask.findMany({
      where: viewer.role === "super_admin" || viewer.role === "platform_ops" ? {} : { entityId: viewer.entityId },
      include: {
        entity: {
          select: {
            id: true,
            legalName: true,
            countryCode: true,
            regulatoryRegime: true,
            verificationTier: true,
            kybStatus: true,
            sanctionsStatus: true,
            riskBand: true
          }
        },
        complianceCase: {
          select: {
            id: true,
            caseType: true,
            status: true,
            riskBand: true,
            priority: true
          }
        }
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: 50
    });
  }

  async resolveReviewTask(taskId: string, dto: ResolveReviewTaskDto, viewer: ViewerContext) {
    this.access.assertCapability(viewer, "view_audit_logs");
    const task = await this.db().complianceReviewTask.findUnique({
      where: { id: taskId },
      include: { complianceCase: true }
    });

    if (!task) {
      throw new NotFoundException("Review task not found");
    }

    const caseStatus = dto.status === "approved"
      ? "approved"
      : dto.status === "rejected"
        ? "rejected"
        : "pending_user";

    await this.db().$transaction(async (tx: any) => {
      await tx.complianceReviewTask.update({
        where: { id: taskId },
        data: {
          status: "resolved",
          assignedToUserId: viewer.userId,
          resolutionNotes: dto.resolutionNote,
          resolvedAt: new Date()
        }
      });

      if (task.caseId) {
        await tx.complianceCase.update({
          where: { id: task.caseId },
          data: {
            status: caseStatus,
            resolvedBy: viewer.userId,
            resolvedAt: caseStatus === "pending_user" ? null : new Date(),
            outcomeSummary: dto.resolutionNote
          }
        });

        await tx.complianceCaseEvent.create({
          data: {
            caseId: task.caseId,
            actorUserId: viewer.userId,
            eventType: "compliance.review.task.resolved",
            fromStatus: task.complianceCase?.status ?? null,
            toStatus: caseStatus,
            note: dto.resolutionNote
          }
        });
      }

      if (task.entityId && dto.status === "approved") {
        await tx.entity.update({
          where: { id: task.entityId },
          data: {
            kybStatus: dto.kybStatus ?? "verified",
            verificationTier: dto.newVerificationTier ?? undefined,
            sanctionsStatus: "clear",
            riskBand: "low",
            complianceHoldReason: null,
            lastKybRefreshAt: new Date()
          }
        });
      }
    });

    await this.events.publish("compliance.review.task.resolved", {
      taskId,
      caseId: task.caseId,
      entityId: task.entityId,
      resolutionStatus: dto.status,
      reviewerUserId: viewer.userId
    });

    return {
      taskId,
      status: dto.status,
      note: dto.resolutionNote
    };
  }

  assessMatchesForCase(matches: any[]) {
    return assessSanctionsMatches(matches as any);
  }
}
