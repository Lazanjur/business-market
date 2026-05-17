import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { InviteMailerWorker } from "./invite-mailer.worker";
import { SessionRiskWorker } from "./session-risk.worker";
import { ScimSyncWorker } from "./scim-sync.worker";

const AUTH_EVENT_NAMES = [
  "auth.member_invited",
  "auth.session_risk_detected",
  "auth.scim_sync_requested"
];

@Injectable()
export class AuthEventsConsumer {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteMailer: InviteMailerWorker,
    private readonly sessionRiskWorker: SessionRiskWorker,
    private readonly scimSyncWorker: ScimSyncWorker
  ) {}

  async drain(limit = 25) {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: "pending",
        eventName: { in: AUTH_EVENT_NAMES },
        availableAt: { lte: new Date() }
      },
      orderBy: [{ createdAt: "asc" }],
      take: limit
    });

    for (const event of events) {
      try {
        switch (event.eventName) {
          case "auth.member_invited":
            await this.inviteMailer.handle(event as any);
            break;
          case "auth.session_risk_detected":
            await this.sessionRiskWorker.handle(event as any);
            break;
          case "auth.scim_sync_requested":
            await this.scimSyncWorker.handle(event as any);
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
