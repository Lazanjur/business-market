import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { ViewerContext } from "@ib-marketplace/shared";
import { PrismaService } from "../../prisma/prisma.service";
import { DomainEventsService } from "../../common/infrastructure/domain-events.service";
import { AccessControlService } from "../../common/auth/access-control.service";
import { UpsertEntityProfileDto } from "./dto/upsert-entity-profile.dto";
import { CreateOrganizationUnitDto } from "./dto/create-organization-unit.dto";
import { UpdateOrganizationUnitDto } from "./dto/update-organization-unit.dto";
import { CreateCertificationDto } from "./dto/create-certification.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";
import { UpsertAuthorityProfileDto } from "./dto/upsert-authority-profile.dto";
import { calculateProfileCompleteness } from "./scoring/profile-completeness.util";
import { calculateTrustScore } from "./scoring/trust-score.util";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

@Injectable()
export class EntitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventsService,
    private readonly access: AccessControlService
  ) {}

  private assertEntityScope(entityId: string, viewer: ViewerContext) {
    if (viewer.role === "super_admin") {
      return;
    }

    if (!viewer.entityId || viewer.entityId !== entityId) {
      throw new ForbiddenException("Cross-entity organization access is not allowed");
    }
  }

  private async getEntityOrFail(entityId: string) {
    const entity = await this.prisma.entity.findUnique({ where: { id: entityId } });
    if (!entity) {
      throw new NotFoundException("Entity not found");
    }
    return entity;
  }

  async getWorkspace(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: {
        profile: true,
        authorityProfile: true,
        units: {
          where: { isActive: true },
          orderBy: [{ unitType: "asc" }, { name: "asc" }]
        },
        memberships: {
          where: { status: "active" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                verificationTier: true,
                isActive: true
              }
            },
            unit: {
              select: { id: true, name: true, unitType: true }
            }
          },
          orderBy: [{ membershipRole: "asc" }, { createdAt: "asc" }]
        },
        certifications: {
          orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
          take: 20
        },
        trustScoreEvents: {
          orderBy: { createdAt: "desc" },
          take: 10
        },
        locations: {
          where: { isActive: true, addressVerified: true },
          select: { id: true, locationType: true, countryCode: true }
        }
      }
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    const completeness = calculateProfileCompleteness(entity.profile);
    const trustScore = calculateTrustScore({
      currentTrustScore: entity.trustScore,
      kybStatus: entity.kybStatus,
      verificationTier: entity.verificationTier,
      entityType: entity.entityType,
      profileCompletenessScore: completeness.score,
      verifiedCertificationsCount: entity.certifications.filter((item) => item.status === "verified").length,
      activeMembershipCount: entity.memberships.length,
      verifiedLocationsCount: entity.locations.length,
      authorityProfileConfigured: Boolean(entity.authorityProfile)
    });

    return {
      entity: {
        id: entity.id,
        legalName: entity.legalName,
        slug: entity.slug,
        countryCode: entity.countryCode,
        regulatoryRegime: entity.regulatoryRegime,
        entityType: entity.entityType,
        kybStatus: entity.kybStatus,
        verificationTier: entity.verificationTier,
        trustScore: entity.trustScore,
        primaryCategory: entity.primaryCategory
      },
      profile: entity.profile,
      authorityProfile: entity.authorityProfile,
      profileCompleteness: completeness,
      trustScore,
      units: entity.units,
      team: entity.memberships,
      certifications: entity.certifications,
      recentTrustScoreEvents: entity.trustScoreEvents,
      governanceSummary: {
        activeMembers: entity.memberships.length,
        procurementUnits: entity.units.filter((unit) => unit.isProcurementEligible).length,
        verifiedLocations: entity.locations.length,
        verifiedCertifications: entity.certifications.filter((item) => item.status === "verified").length
      }
    };
  }

  async getProfile(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    await this.getEntityOrFail(entityId);

    const profile = await this.prisma.entityProfile.findUnique({ where: { entityId } });
    const completeness = calculateProfileCompleteness(profile);
    return { profile, completeness };
  }

  async upsertProfile(entityId: string, dto: UpsertEntityProfileDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_entity_settings", entityId);
    await this.getEntityOrFail(entityId);

    const profileInput = {
      displayName: dto.displayName,
      description: dto.description,
      websiteUrl: dto.websiteUrl,
      supportEmail: dto.supportEmail,
      salesEmail: dto.salesEmail,
      phoneNumber: dto.phoneNumber,
      yearFounded: dto.yearFounded,
      employeeRange: dto.employeeRange,
      annualRevenueBand: dto.annualRevenueBand,
      coverageCountries: dto.coverageCountries,
      supportedLanguages: dto.supportedLanguages,
      capabilities: dto.capabilities,
      profileStatus: dto.profileStatus
    };

    const completeness = calculateProfileCompleteness(profileInput);

    const profile = await this.prisma.entityProfile.upsert({
      where: { entityId },
      create: {
        entityId,
        displayName: dto.displayName,
        tagline: dto.tagline,
        description: dto.description,
        websiteUrl: dto.websiteUrl,
        supportEmail: dto.supportEmail,
        salesEmail: dto.salesEmail,
        phoneNumber: dto.phoneNumber,
        yearFounded: dto.yearFounded,
        employeeRange: dto.employeeRange,
        annualRevenueBand: dto.annualRevenueBand,
        legalForm: dto.legalForm,
        procurementReadiness: dto.procurementReadiness ?? "not_assessed",
        profileVisibility: dto.profileVisibility ?? "members_only",
        coverageCountries: dto.coverageCountries ?? [],
        supportedLanguages: dto.supportedLanguages ?? [],
        capabilities: (dto.capabilities as any) ?? undefined,
        seoSummary: dto.seoSummary,
        profileStatus: dto.profileStatus ?? "draft",
        completenessScore: completeness.score,
        insuranceStatus: dto.insuranceStatus,
        insuranceExpiresAt: dto.insuranceExpiresAt ? new Date(dto.insuranceExpiresAt) : undefined
      },
      update: {
        displayName: dto.displayName,
        tagline: dto.tagline,
        description: dto.description,
        websiteUrl: dto.websiteUrl,
        supportEmail: dto.supportEmail,
        salesEmail: dto.salesEmail,
        phoneNumber: dto.phoneNumber,
        yearFounded: dto.yearFounded,
        employeeRange: dto.employeeRange,
        annualRevenueBand: dto.annualRevenueBand,
        legalForm: dto.legalForm,
        procurementReadiness: dto.procurementReadiness,
        profileVisibility: dto.profileVisibility,
        coverageCountries: dto.coverageCountries,
        supportedLanguages: dto.supportedLanguages,
        capabilities: dto.capabilities as any,
        seoSummary: dto.seoSummary,
        profileStatus: dto.profileStatus,
        completenessScore: completeness.score,
        insuranceStatus: dto.insuranceStatus,
        insuranceExpiresAt: dto.insuranceExpiresAt ? new Date(dto.insuranceExpiresAt) : undefined
      }
    });

    await this.events.publish("entity.profile.updated", {
      entityId,
      completenessScore: completeness.score,
      profileStatus: profile.profileStatus
    });

    return {
      profile,
      completeness
    };
  }

  async listTeam(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_team", entityId);

    return this.prisma.entityMembership.findMany({
      where: { entityId, status: { in: ["active", "suspended"] } },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            verificationTier: true,
            isActive: true,
            createdAt: true
          }
        },
        unit: {
          select: { id: true, name: true, unitType: true }
        }
      },
      orderBy: [{ membershipRole: "asc" }, { createdAt: "asc" }]
    });
  }

  async updateMembership(entityId: string, membershipId: string, dto: UpdateMembershipDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_team", entityId);

    const membership = await this.prisma.entityMembership.findUnique({ where: { id: membershipId } });
    if (!membership || membership.entityId !== entityId) {
      throw new NotFoundException("Membership not found");
    }

    if (membership.membershipRole === "owner" && dto.membershipRole && dto.membershipRole !== "owner") {
      const activeOwners = await this.prisma.entityMembership.count({
        where: { entityId, membershipRole: "owner", status: "active" }
      });
      if (activeOwners <= 1) {
        throw new BadRequestException("At least one active owner must remain on the entity");
      }
    }

    const updated = await this.prisma.entityMembership.update({
      where: { id: membershipId },
      data: {
        membershipRole: dto.membershipRole ?? undefined,
        permissions: dto.permissions ?? undefined,
        unitId: dto.unitId === null ? null : dto.unitId ?? undefined,
        status: dto.status ?? undefined,
        lastElevatedAt: dto.membershipRole ? new Date() : undefined,
        removedAt: dto.status === "removed" ? new Date() : undefined,
        removedReason: dto.status === "removed" ? `removed_by:${viewer.userId}` : undefined
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        },
        unit: true
      }
    });

    await this.events.publish("entity.membership.updated", {
      entityId,
      membershipId,
      membershipRole: updated.membershipRole,
      status: updated.status,
      unitId: updated.unitId
    });

    return updated;
  }

  async removeMembership(entityId: string, membershipId: string, viewer: ViewerContext) {
    return this.updateMembership(
      entityId,
      membershipId,
      { status: "removed" },
      viewer
    );
  }

  async listUnits(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_entity_settings", entityId);

    return this.prisma.organizationUnit.findMany({
      where: { entityId },
      orderBy: [{ unitType: "asc" }, { name: "asc" }]
    });
  }

  async createUnit(entityId: string, dto: CreateOrganizationUnitDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_entity_settings", entityId);
    await this.getEntityOrFail(entityId);

    const unit = await this.prisma.organizationUnit.create({
      data: {
        entityId,
        parentId: dto.parentId,
        unitType: dto.unitType,
        name: dto.name,
        code: dto.code,
        slug: slugify(dto.slug ?? dto.name),
        description: dto.description,
        countryCode: dto.countryCode?.toUpperCase(),
        region: dto.region,
        city: dto.city,
        costCenter: dto.costCenter,
        budgetOwner: dto.budgetOwner,
        isProcurementEligible: dto.isProcurementEligible ?? false
      }
    });

    await this.events.publish("entity.unit.created", {
      entityId,
      unitId: unit.id,
      unitType: unit.unitType,
      slug: unit.slug
    });

    return unit;
  }

  async updateUnit(entityId: string, unitId: string, dto: UpdateOrganizationUnitDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_entity_settings", entityId);

    const unit = await this.prisma.organizationUnit.findUnique({ where: { id: unitId } });
    if (!unit || unit.entityId !== entityId) {
      throw new NotFoundException("Organization unit not found");
    }

    const updated = await this.prisma.organizationUnit.update({
      where: { id: unitId },
      data: {
        name: dto.name,
        code: dto.code,
        slug: dto.slug ? slugify(dto.slug) : undefined,
        description: dto.description,
        parentId: dto.parentId === null ? null : dto.parentId ?? undefined,
        countryCode: dto.countryCode === null ? null : dto.countryCode?.toUpperCase(),
        region: dto.region === null ? null : dto.region,
        city: dto.city === null ? null : dto.city,
        costCenter: dto.costCenter === null ? null : dto.costCenter,
        budgetOwner: dto.budgetOwner === null ? null : dto.budgetOwner,
        isProcurementEligible: dto.isProcurementEligible,
        isActive: dto.isActive
      }
    });

    await this.events.publish("entity.unit.updated", {
      entityId,
      unitId,
      isProcurementEligible: updated.isProcurementEligible,
      isActive: updated.isActive
    });

    return updated;
  }

  async listCertifications(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    return this.prisma.entityCertification.findMany({
      where: { entityId },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }]
    });
  }

  async addCertification(entityId: string, dto: CreateCertificationDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_entity_settings", entityId);
    await this.getEntityOrFail(entityId);

    const certification = await this.prisma.entityCertification.create({
      data: {
        entityId,
        certificationType: dto.certificationType,
        issuingBody: dto.issuingBody,
        referenceNumber: dto.referenceNumber,
        status: "pending",
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        documentUrl: dto.documentUrl,
        scope: dto.scope as any
      }
    });

    await this.events.publish("entity.certification.submitted", {
      entityId,
      certificationId: certification.id,
      certificationType: certification.certificationType
    });

    return certification;
  }

  async getTrustScore(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);

    const [entity, profile, certifications, memberships, locations, events] = await Promise.all([
      this.getEntityOrFail(entityId),
      this.prisma.entityProfile.findUnique({ where: { entityId } }),
      this.prisma.entityCertification.findMany({ where: { entityId } }),
      this.prisma.entityMembership.findMany({ where: { entityId, status: "active" } }),
      this.prisma.entityLocation.findMany({ where: { entityId, isActive: true, addressVerified: true } }),
      this.prisma.trustScoreEvent.findMany({ where: { entityId }, orderBy: { createdAt: "desc" }, take: 25 })
    ]);

    const completeness = calculateProfileCompleteness(profile);
    const trustScore = calculateTrustScore({
      currentTrustScore: entity.trustScore,
      kybStatus: entity.kybStatus,
      verificationTier: entity.verificationTier,
      entityType: entity.entityType,
      profileCompletenessScore: completeness.score,
      verifiedCertificationsCount: certifications.filter((item) => item.status === "verified").length,
      activeMembershipCount: memberships.length,
      verifiedLocationsCount: locations.length,
      authorityProfileConfigured: entity.entityType === "public_authority" && Boolean(await this.prisma.entityAuthorityProfile.findUnique({ where: { entityId } }))
    });

    return {
      currentStoredScore: entity.trustScore,
      computed: trustScore,
      recentEvents: events,
      profileCompleteness: completeness
    };
  }

  async recalculateTrustScore(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_entity_settings", entityId);

    const entity = await this.getEntityOrFail(entityId);
    const payload = await this.getTrustScore(entityId, viewer);
    const scoreBefore = entity.trustScore;
    const scoreAfter = payload.computed.score;

    await this.prisma.$transaction(async (tx) => {
      await tx.entity.update({
        where: { id: entityId },
        data: { trustScore: scoreAfter }
      });

      await tx.trustScoreEvent.create({
        data: {
          entityId,
          source: "manual_recalculation",
          reason: "Entity governance workspace recalculated trust score",
          delta: scoreAfter - scoreBefore,
          scoreBefore,
          scoreAfter,
          metadata: {
            breakdown: payload.computed.breakdown,
            profileCompleteness: payload.profileCompleteness.score,
            triggeredByUserId: viewer.userId
          }
        }
      });
    });

    await this.events.publish("entity.trust_score.recalculated", {
      entityId,
      scoreBefore,
      scoreAfter,
      triggeredByUserId: viewer.userId
    });

    return {
      scoreBefore,
      scoreAfter,
      delta: scoreAfter - scoreBefore,
      breakdown: payload.computed.breakdown
    };
  }

  async getAuthorityProfile(entityId: string, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    const entity = await this.getEntityOrFail(entityId);

    return {
      entityType: entity.entityType,
      authorityProfile: await this.prisma.entityAuthorityProfile.findUnique({ where: { entityId } })
    };
  }

  async upsertAuthorityProfile(entityId: string, dto: UpsertAuthorityProfileDto, viewer: ViewerContext) {
    this.assertEntityScope(entityId, viewer);
    this.access.assertCapability(viewer, "manage_entity_settings", entityId);

    const entity = await this.getEntityOrFail(entityId);
    if (entity.entityType !== "public_authority") {
      throw new BadRequestException("Authority profile is available only for public authority entities");
    }

    const authorityProfile = await this.prisma.entityAuthorityProfile.upsert({
      where: { entityId },
      create: {
        entityId,
        authorityCode: dto.authorityCode,
        authorityLevel: dto.authorityLevel,
        procurementScope: dto.procurementScope,
        regionName: dto.regionName,
        budgetBand: dto.budgetBand,
        noticePublishingEndpoint: dto.noticePublishingEndpoint,
        policyUrl: dto.policyUrl,
        isUtilitiesEntity: dto.isUtilitiesEntity ?? false,
        isFrameworkBuyer: dto.isFrameworkBuyer ?? false
      },
      update: {
        authorityCode: dto.authorityCode,
        authorityLevel: dto.authorityLevel,
        procurementScope: dto.procurementScope,
        regionName: dto.regionName,
        budgetBand: dto.budgetBand,
        noticePublishingEndpoint: dto.noticePublishingEndpoint,
        policyUrl: dto.policyUrl,
        isUtilitiesEntity: dto.isUtilitiesEntity,
        isFrameworkBuyer: dto.isFrameworkBuyer
      }
    });

    await this.events.publish("entity.authority_profile.updated", {
      entityId,
      authorityLevel: authorityProfile.authorityLevel,
      procurementScope: authorityProfile.procurementScope
    });

    return authorityProfile;
  }
}
