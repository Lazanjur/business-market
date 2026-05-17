import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../../api/src/prisma/prisma.service";

@Injectable()
export class PostcardDispatchWorker {
  private readonly logger = new Logger(PostcardDispatchWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(payload: { requestId: string }) {
    const dispatch = await (this.prisma as any).locationPostalDispatch.findFirst({
      where: { verificationRequestId: payload.requestId },
      orderBy: { requestedAt: "desc" }
    });

    if (!dispatch) {
      return { processed: false, reason: "postal_dispatch_missing" };
    }

    await (this.prisma as any).locationPostalDispatch.update({
      where: { id: dispatch.id },
      data: {
        status: "dispatched",
        providerTrackingId: dispatch.providerTrackingId ?? `lob_${dispatch.id.slice(0, 8)}`,
        dispatchedAt: new Date()
      }
    });

    this.logger.log(`Dispatched postcard verification mail for request ${payload.requestId}`);
    return { processed: true, dispatchId: dispatch.id };
  }
}
