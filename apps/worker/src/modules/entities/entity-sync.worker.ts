import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../api/src/prisma/prisma.service";

@Injectable()
export class EntitySyncWorker {
  private readonly logger = new Logger(EntitySyncWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: { entityId: string }) {
    const entity = await this.prisma.entity.findUnique({
      where: { id: payload.entityId },
      include: {
        profile: true,
        authorityProfile: true,
        certifications: {
          where: { status: "verified" },
          select: {
            certificationType: true,
            expiresAt: true
          }
        },
        locations: {
          where: { isActive: true, isPrimary: true },
          select: {
            city: true,
            countryCode: true,
            locationType: true
          }
        }
      }
    });

    if (!entity) {
      return null;
    }

    const projection = {
      entityId: entity.id,
      legalName: entity.legalName,
      slug: entity.slug,
      countryCode: entity.countryCode,
      regulatoryRegime: entity.regulatoryRegime,
      entityType: entity.entityType,
      trustScore: entity.trustScore,
      profile: entity.profile
        ? {
            displayName: entity.profile.displayName,
            tagline: entity.profile.tagline,
            websiteUrl: entity.profile.websiteUrl,
            coverageCountries: entity.profile.coverageCountries,
            supportedLanguages: entity.profile.supportedLanguages,
            completenessScore: entity.profile.completenessScore
          }
        : null,
      authorityProfile: entity.authorityProfile,
      primaryLocation: entity.locations[0] ?? null,
      verifiedCertifications: entity.certifications
    };

    this.logger.log(`Prepared entity projection ${JSON.stringify(projection)}`);
    return projection;
  }
}
