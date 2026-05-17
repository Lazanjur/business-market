import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { DomainEventsService } from "../../common/infrastructure/domain-events.service";
@Injectable()
export class SsoService {
  constructor(private readonly prisma:PrismaService, private readonly events:DomainEventsService) {}
  async listConnections(entityId:string){ return (this.prisma as any).ssoConnection?.findMany?.({ where:{ entityId } }) ?? []; }
  async createConnection(entityId:string,dto:any,auth:any){ const rec={ id: randomUUID(), entityId, providerName:dto.providerName, issuerUrl:dto.issuerUrl, audience:dto.audience, createdByUserId:auth.userId, status:"active" }; try{ await (this.prisma as any).ssoConnection?.create?.({ data:rec }); }catch{} return rec; }
  async handleCallback(entityId:string, providerName:string, dto:any){ return { entityId, providerName, code: dto.code, state: dto.state, status:"received" }; }
  async requestScimSync(entityId:string, connectionId:string){ await this.events.publish("entity.updated",{ entityId, connectionId, action:"scim_sync_requested" },{ aggregateType:"entity", aggregateId: entityId }); return { queued:true, entityId, connectionId }; }
}
