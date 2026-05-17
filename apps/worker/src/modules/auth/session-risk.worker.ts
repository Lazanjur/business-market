import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class SessionRiskWorker {
  private readonly logger = new Logger(SessionRiskWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: { payload: any }) {
    const payload = event.payload;
    if (!payload.sessionId || typeof payload.riskScore !== "number") {
      return { ignored: true };
    }

    if (payload.riskScore < 60) {
      return { elevated: false };
    }

    await this.prisma.userSession.update({
      where: { id: payload.sessionId },
      data: {
        requiresStepUp: true,
        riskScore: payload.riskScore
      }
    });

    await this.prisma.authAuditEvent.create({
      data: {
        actorUserId: payload.userId,
        entityId: payload.entityId,
        sessionId: payload.sessionId,
        eventType: "auth.session_risk_escalated",
        severity: "warning",
        metadata: payload
      }
    });

    this.logger.warn(`Escalated session ${payload.sessionId} for step-up auth`);
    return { elevated: true };
  }
}
