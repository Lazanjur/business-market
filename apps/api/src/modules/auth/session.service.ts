import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}
  async createSession(userId: string, context: any) { const session={ id: randomUUID(), userId, ...context, status:"active" }; try { await (this.prisma as any).authSession?.create?.({ data: session }); } catch {} return { session, refreshToken: randomUUID() }; }
  async listUserSessions(userId: string) { return (this.prisma as any).authSession?.findMany?.({ where:{ userId }, orderBy:{ createdAt:"desc" } }) ?? []; }
  async revokeSession(sessionId: string, userId?: string, reason="revoke") { const existing = await (this.prisma as any).authSession?.findUnique?.({ where:{ id: sessionId } }); if (!existing && userId!==undefined) throw new NotFoundException("Session not found"); return (this.prisma as any).authSession?.update?.({ where:{ id: sessionId }, data:{ status:"revoked", revokedReason: reason } }) ?? { id: sessionId, status:"revoked" }; }
  async rotateRefreshToken(_: string) { return { refreshToken: randomUUID() }; }
}
