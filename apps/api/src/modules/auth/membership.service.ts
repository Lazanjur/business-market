import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { DomainEventsService } from "../../common/infrastructure/domain-events.service";
@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService, private readonly events: DomainEventsService) {}
  async listMembers(entityId:string) { return (this.prisma as any).entityMembership?.findMany?.({ where:{ entityId }, include:{ user:true } }) ?? []; }
  async inviteMember(entityId:string, dto:any, auth:any) { const invite={ id: randomUUID(), entityId, email: dto.email, membershipRole: dto.membershipRole ?? "member", invitedByUserId: auth.userId, status:"pending" }; try { await (this.prisma as any).entityInvite?.create?.({ data: invite }); } catch {} await this.events.publish("entity.updated",{ entityId, inviteId: invite.id, action:"member_invited" },{ aggregateType:"entity", aggregateId: entityId }); return invite; }
  async acceptInvite(dto:any, auth:any) { return { accepted: true, inviteToken: dto.inviteToken, userId: auth.userId }; }
  async revokeInvite(entityId:string, inviteId:string) { return { entityId, inviteId, status:"revoked" }; }
}
