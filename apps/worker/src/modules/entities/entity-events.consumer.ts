import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../api/src/prisma/prisma.service";
import { ProfileCompletenessWorker } from "./profile-completeness.worker";
import { TrustScoreWorker } from "./trust-score.worker";
import { EntitySyncWorker } from "./entity-sync.worker";

const ENTITY_EVENT_NAMES = [
  "entity.profile.updated",
  "entity.membership.updated",
  "entity.unit.created",
  "entity.unit.updated",
  "entity.certification.submitted",
  "entity.authority_profile.updated",
  "entity.trust_score.recalculated"
];

@Injectable()
export class EntityEventsConsumer {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileCompletenessWorker: ProfileCompletenessWorker,
    private readonly trustScoreWorker: TrustScoreWorker,
    private readonly entitySyncWorker: EntitySyncWorker
  ) {}

  async drain(limit = 25) {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: "pending",
        eventName: { in: ENTITY_EVENT_NAMES },
        availableAt: { lte: new Date() }
      },
      orderBy: [{ createdAt: "asc" }],
      take: limit
    });

    for (const event of events) {
      try {
        switch (event.eventName) {
          case "entity.profile.updated":
            await this.profileCompletenessWorker.handle(event.payload as any);
            await this.trustScoreWorker.handle({ ...(event.payload as any), source: event.eventName });
            await this.entitySyncWorker.handle(event.payload as any);
            break;
          case "entity.certification.submitted":
          case "entity.membership.updated":
          case "entity.authority_profile.updated":
          case "entity.trust_score.recalculated":
            await this.trustScoreWorker.handle({ ...(event.payload as any), source: event.eventName });
            await this.entitySyncWorker.handle(event.payload as any);
            break;
          case "entity.unit.created":
          case "entity.unit.updated":
            await this.entitySyncWorker.handle(event.payload as any);
            break;
          default:
            break;
        }

        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "published",
            publishedAt: new Date(),
            attempts: { increment: 1 },
            lastError: null
          }
        });
      } catch (error) {
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            lastError: error instanceof Error ? error.message : String(error),
            availableAt: new Date(Date.now() + 60_000)
          }
        });
      }
    }

    return { processed: events.length };
  }
}
