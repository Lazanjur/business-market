import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Permission, ViewerContext } from "@ib-marketplace/shared";
import { isHighRiskMembershipRole } from "@ib-marketplace/shared";
import * as bcrypt from "bcrypt";
import { DomainEventsService } from "../../common/infrastructure/domain-events.service";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthenticatedResponse, JwtAccessPayload, LoginResponse, RequestContextInput } from "./auth.types";
import { resolvePermissions } from "./policies/access-matrix";
import { SessionService } from "./session.service";
import { MfaService } from "./mfa.service";
import { RegisterEntityAdminDto } from "./dto/register-entity-admin.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshSessionDto } from "./dto/refresh-session.dto";
import { CompleteMfaDto } from "./dto/complete-mfa.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly mfaService: MfaService,
    private readonly events: DomainEventsService
  ) {}

  private buildAuthContext(input: {
    user: {
      id: string;
      email: string;
      role: string;
      verificationTier: string;
      entityId?: string | null;
      entity?: { regulatoryRegime?: string | null } | null;
    };
    membership?: {
      entityId: string;
      membershipRole: string;
      permissions: string[];
    } | null;
    sessionId: string;
  }): ViewerContext {
    const permissions = resolvePermissions({
      systemRole: input.user.role,
      membershipRole: input.membership?.membershipRole,
      explicitPermissions: input.membership?.permissions ?? []
    });

    return {
      userId: input.user.id,
      email: input.user.email,
      role: input.user.role,
      entityId: input.membership?.entityId ?? input.user.entityId,
      membershipRole: (input.membership?.membershipRole as any) ?? null,
      verificationTier: (input.user.verificationTier as any) ?? "basic",
      permissions,
      sessionId: input.sessionId,
      regulatoryRegime: (input.user.entity?.regulatoryRegime as any) ?? undefined
    };
  }

  private async signAccessToken(auth: ViewerContext) {
    const payload: JwtAccessPayload = {
      sub: auth.userId,
      email: auth.email,
      sessionId: auth.sessionId!,
      entityId: auth.entityId,
      role: auth.role,
      membershipRole: (auth.membershipRole as any) ?? undefined,
      verificationTier: auth.verificationTier,
      permissions: auth.permissions as Permission[],
      regulatoryRegime: auth.regulatoryRegime
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: process.env.JWT_ACCESS_TTL ?? "15m"
    });
  }

  private async buildAuthenticatedResponse(auth: ViewerContext, refreshToken: string): Promise<AuthenticatedResponse> {
    const accessToken = await this.signAccessToken(auth);
    return {
      status: "authenticated",
      accessToken,
      refreshToken,
      sessionId: auth.sessionId!,
      me: {
        userId: auth.userId,
        entityId: auth.entityId,
        role: auth.role,
        membershipRole: auth.membershipRole ?? null,
        verificationTier: auth.verificationTier,
        permissions: auth.permissions
      }
    };
  }

  async registerEntityAdmin(dto: RegisterEntityAdminDto, requestContext: RequestContextInput) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });
    if (existingUser) {
      throw new BadRequestException("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = await this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.create({
        data: {
          legalName: dto.legalName,
          slug: dto.slug,
          registrationNumber: dto.registrationNumber,
          vatNumber: dto.vatNumber,
          countryCode: dto.countryCode.toUpperCase(),
          regulatoryRegime: dto.regulatoryRegime,
          entityType: dto.entityType,
          kybStatus: "pending",
          verificationTier: "basic"
        }
      });

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: "entity_user",
          verificationTier: "basic",
          entityId: entity.id
        },
        include: { entity: true }
      });

      const membership = await tx.entityMembership.create({
        data: {
          entityId: entity.id,
          userId: user.id,
          membershipRole: dto.entityType === "public_authority" ? "authority_admin" : "owner",
          status: "active",
          joinedAt: new Date()
        }
      });

      await tx.authAuditEvent.create({
        data: {
          actorUserId: user.id,
          entityId: entity.id,
          eventType: "auth.entity_owner_registered",
          severity: "info",
          metadata: {
            entityType: dto.entityType,
            regulatoryRegime: dto.regulatoryRegime
          }
        }
      });

      return { user, entity, membership };
    });

    const { session, refreshToken } = await this.sessionService.createSession(created.user.id, {
      ...requestContext,
      issueRefreshToken: true
    });

    const auth = this.buildAuthContext({
      user: created.user,
      membership: created.membership,
      sessionId: session.id
    });

    await this.events.publish(
      "auth.entity_owner_registered",
      {
        userId: created.user.id,
        entityId: created.entity.id,
        regulatoryRegime: created.entity.regulatoryRegime,
        entityType: created.entity.entityType
      },
      { aggregateType: "entity", aggregateId: created.entity.id }
    );

    return this.buildAuthenticatedResponse(auth, refreshToken!);
  }

  async login(dto: LoginDto, requestContext: RequestContextInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        entity: true,
        memberships: {
          where: {
            status: "active",
            ...(dto.entityId ? { entityId: dto.entityId } : {})
          },
          orderBy: [{ createdAt: "asc" }],
          take: 1
        }
      }
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("User account is not active");
    }

    const membership = user.memberships[0] ?? null;
    if (!membership) {
      throw new UnauthorizedException("This account is not attached to a verified business entity");
    }

    const risk = this.sessionService.evaluateRisk(requestContext);
    const requiresMfa =
      isHighRiskMembershipRole(membership.membershipRole as any) ||
      user.verificationTier !== "basic" ||
      risk.requiresStepUp;

    const hasVerifiedMfa = await this.mfaService.hasVerifiedMethod(user.id);
    const { session, refreshToken } = await this.sessionService.createSession(user.id, {
      ...requestContext,
      riskScore: risk.riskScore,
      requiresStepUp: requiresMfa,
      issueRefreshToken: !requiresMfa
    });

    await this.prisma.authAuditEvent.create({
      data: {
        actorUserId: user.id,
        entityId: membership.entityId,
        sessionId: session.id,
        eventType: requiresMfa ? "auth.login_password_verified_mfa_required" : "auth.login_success",
        severity: risk.requiresStepUp ? "warning" : "info",
        ipAddress: requestContext.ipAddress,
        metadata: {
          riskScore: risk.riskScore,
          membershipRole: membership.membershipRole,
          hasVerifiedMfa
        }
      }
    });

    if (risk.requiresStepUp) {
      await this.events.publish(
        "auth.session_risk_detected",
        {
          sessionId: session.id,
          userId: user.id,
          entityId: membership.entityId,
          riskScore: risk.riskScore,
          source: "password_login"
        },
        { aggregateType: "user_session", aggregateId: session.id }
      );
    }

    const auth = this.buildAuthContext({
      user,
      membership,
      sessionId: session.id
    });

    if (requiresMfa) {
      return {
        status: "mfa_required",
        sessionId: session.id,
        method: "totp",
        enrollmentRequired: !hasVerifiedMfa
      };
    }

    return this.buildAuthenticatedResponse(auth, refreshToken!);
  }

  async completeMfa(dto: CompleteMfaDto) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        user: {
          include: {
            entity: true,
            memberships: {
              where: { status: "active" },
              orderBy: [{ createdAt: "asc" }],
              take: 1
            }
          }
        }
      }
    });

    if (!session || session.status !== "active" || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Session is not valid");
    }

    const verified = await this.mfaService.verifyChallenge(session.userId, dto.code);
    if (!verified) {
      throw new UnauthorizedException("Invalid MFA code");
    }

    await this.sessionService.markMfaSatisfied(session.id);
    const refreshToken = await this.sessionService.rotateRefreshToken(session.id);
    const auth = this.buildAuthContext({
      user: session.user,
      membership: session.user.memberships[0] ?? null,
      sessionId: session.id
    });

    await this.prisma.authAuditEvent.create({
      data: {
        actorUserId: session.userId,
        entityId: auth.entityId ?? undefined,
        sessionId: session.id,
        eventType: "auth.mfa_challenge_completed",
        severity: "info"
      }
    });

    return this.buildAuthenticatedResponse(auth, refreshToken);
  }

  async refresh(dto: RefreshSessionDto) {
    const session = await this.sessionService.validateRefreshToken(dto.refreshToken);
    const membership = session.user.memberships[0] ?? null;
    const auth = this.buildAuthContext({
      user: session.user,
      membership,
      sessionId: session.id
    });
    const refreshToken = await this.sessionService.rotateRefreshToken(session.id);
    return this.buildAuthenticatedResponse(auth, refreshToken);
  }

  async logout(auth: ViewerContext) {
    if (!auth.sessionId) {
      throw new UnauthorizedException("Session context missing");
    }
    return this.sessionService.revokeSession(auth.sessionId, auth.userId, "logout");
  }

  async me(auth: ViewerContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        entity: true,
        memberships: {
          where: { status: "active" },
          orderBy: [{ createdAt: "asc" }]
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        verificationTier: user.verificationTier,
        role: user.role,
        entityId: user.entityId
      },
      entity: user.entity,
      memberships: user.memberships,
      activePermissions: auth.permissions
    };
  }
}
