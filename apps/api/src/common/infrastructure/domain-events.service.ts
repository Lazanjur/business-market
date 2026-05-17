import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { DomainEventName } from "@ib-marketplace/shared";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);
  constructor(private readonly prisma: PrismaService) {}
  async publish(name: DomainEventName | string, payload: Record<string, unknown>, meta?: { aggregateType?: string; aggregateId?: string; correlationId?: string }) {
    const event = { id: randomUUID(), eventName: name, aggregateType: meta?.aggregateType ?? "system", aggregateId: meta?.aggregateId ?? randomUUID(), payload, correlationId: meta?.correlationId ?? null, status: "pending" };
    try { await (this.prisma as any).outboxEvent?.create?.({ data: event }); } catch { this.logger.log(`event ${name}: ${JSON.stringify(payload)}`); }
    return event;
  }
}
