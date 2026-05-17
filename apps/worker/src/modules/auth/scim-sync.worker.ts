import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class ScimSyncWorker {
  private readonly logger = new Logger(ScimSyncWorker.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: { payload: any }) {
    const payload = event.payload;
    const connection = await this.prisma.ssoConnection.findUnique({
      where: { id: payload.connectionId }
    });

    if (!connection) {
      this.logger.warn(`SCIM sync skipped; connection ${payload.connectionId} not found`);
      return { skipped: true };
    }

    this.logger.log(`Queued SCIM sync for ${connection.providerName}`);
    return {
      queued: true,
      connectionId: connection.id,
      providerName: connection.providerName,
      scimEndpoint: connection.scimEndpoint
    };
  }
}
