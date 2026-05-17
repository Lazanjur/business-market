import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../api/src/prisma/prisma.service";

@Injectable()
export class GeocodeReviewWorker {
  private readonly logger = new Logger(GeocodeReviewWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: { locationId: string; reason?: string }) {
    const openTask = await (this.prisma as any).locationGeocodeReviewTask.findFirst({
      where: {
        locationId: payload.locationId,
        status: "open"
      },
      orderBy: { createdAt: "desc" }
    });

    if (openTask) {
      return { processed: true, taskId: openTask.id, reused: true };
    }

    const created = await (this.prisma as any).locationGeocodeReviewTask.create({
      data: {
        locationId: payload.locationId,
        reviewType: "manual_geocode",
        status: "open",
        priority: "high",
        reason: payload.reason ?? "Manual geocode review required"
      }
    });

    this.logger.warn(`Queued manual geocode review for ${payload.locationId}`);
    return { processed: true, taskId: created.id };
  }
}
