import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";
import type { Request } from "express";
import type { ViewerContext } from "@ib-marketplace/shared";
import { CurrentAuthContext } from "../../common/auth/decorators/current-auth-context.decorator";
import { RequirePermissions } from "../../common/auth/decorators/require-permissions.decorator";
import { RequireVerificationTier } from "../../common/auth/decorators/require-verification-tier.decorator";
import { JwtAuthGuard } from "../../common/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../common/auth/guards/permissions.guard";
import { VerificationTierGuard } from "../../common/auth/guards/verification-tier.guard";
import { AuthService } from "./auth.service";
import { MembershipService } from "./membership.service";
import { SessionService } from "./session.service";
import { MfaService } from "./mfa.service";
import { SsoService } from "./sso.service";
import { RegisterEntityAdminDto } from "./dto/register-entity-admin.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshSessionDto } from "./dto/refresh-session.dto";
import { SetupTotpDto } from "./dto/setup-totp.dto";
import { VerifyTotpDto } from "./dto/verify-totp.dto";
import { CompleteMfaDto } from "./dto/complete-mfa.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { CreateSsoConnectionDto } from "./dto/create-sso-connection.dto";
import { SsoCallbackDto } from "./dto/sso-callback.dto";

function getRequestContext(request: Request) {
  return {
    ipAddress: request.ip,
    userAgent: request.headers["user-agent"]?.toString(),
    deviceFingerprint: request.headers["x-device-fingerprint"]?.toString(),
    geoCountryCode: request.headers["x-geo-country"]?.toString(),
    deviceLabel: request.headers["x-device-label"]?.toString()
  };
}

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly membershipService: MembershipService,
    private readonly sessionService: SessionService,
    private readonly mfaService: MfaService,
    private readonly ssoService: SsoService
  ) {}

  @Post("auth/register-entity-admin")
  registerEntityAdmin(@Body() dto: RegisterEntityAdminDto, @Req() request: Request) {
    return this.authService.registerEntityAdmin(dto, getRequestContext(request));
  }

  @Post("auth/login")
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, { ...getRequestContext(request), deviceLabel: dto.deviceLabel });
  }

  @Post("auth/mfa/challenge/verify")
  completeMfa(@Body() dto: CompleteMfaDto) {
    return this.authService.completeMfa(dto);
  }

  @Post("auth/refresh")
  refresh(@Body() dto: RefreshSessionDto) {
    return this.authService.refresh(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("auth/logout")
  logout(@CurrentAuthContext() auth: ViewerContext) {
    return this.authService.logout(auth);
  }

  @UseGuards(JwtAuthGuard)
  @Get("auth/me")
  me(@CurrentAuthContext() auth: ViewerContext) {
    return this.authService.me(auth);
  }

  @UseGuards(JwtAuthGuard)
  @Post("auth/mfa/setup/totp")
  startTotpSetup(
    @CurrentAuthContext() auth: ViewerContext,
    @Body() dto: SetupTotpDto
  ) {
    return this.mfaService.startTotpEnrollment(auth.userId, auth.email ?? "user@ib-marketplace.local", dto.label);
  }

  @UseGuards(JwtAuthGuard)
  @Post("auth/mfa/setup/totp/verify")
  verifyTotpSetup(
    @CurrentAuthContext() auth: ViewerContext,
    @Body() dto: VerifyTotpDto
  ) {
    return this.mfaService.verifyEnrollment(auth.userId, dto.methodId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Get("auth/sessions")
  listSessions(@CurrentAuthContext() auth: ViewerContext) {
    return this.sessionService.listUserSessions(auth.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete("auth/sessions/:sessionId")
  revokeOwnSession(
    @CurrentAuthContext() auth: ViewerContext,
    @Param("sessionId") sessionId: string
  ) {
    return this.sessionService.revokeSession(sessionId, auth.userId, "user_revoke");
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("entity.members.read")
  @Get("entities/:entityId/members")
  listMembers(
    @Param("entityId") entityId: string,
    @CurrentAuthContext() auth: ViewerContext
  ) {
    return this.membershipService.listMembers(entityId, auth);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, VerificationTierGuard)
  @RequirePermissions("entity.members.invite")
  @RequireVerificationTier("standard")
  @Post("entities/:entityId/invites")
  inviteMember(
    @Param("entityId") entityId: string,
    @Body() dto: InviteMemberDto,
    @CurrentAuthContext() auth: ViewerContext
  ) {
    return this.membershipService.inviteMember(entityId, dto, auth);
  }

  @UseGuards(JwtAuthGuard)
  @Post("auth/invites/accept")
  acceptInvite(
    @Body() dto: AcceptInviteDto,
    @CurrentAuthContext() auth: ViewerContext
  ) {
    return this.membershipService.acceptInvite(dto, auth);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("entity.members.manage")
  @Delete("entities/:entityId/invites/:inviteId")
  revokeInvite(
    @Param("entityId") entityId: string,
    @Param("inviteId") inviteId: string,
    @CurrentAuthContext() auth: ViewerContext
  ) {
    return this.membershipService.revokeInvite(entityId, inviteId, auth);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, VerificationTierGuard)
  @RequirePermissions("entity.sso.manage")
  @RequireVerificationTier("premium")
  @Get("entities/:entityId/sso-connections")
  listSsoConnections(
    @Param("entityId") entityId: string,
    @CurrentAuthContext() auth: ViewerContext
  ) {
    return this.ssoService.listConnections(entityId, auth);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, VerificationTierGuard)
  @RequirePermissions("entity.sso.manage")
  @RequireVerificationTier("premium")
  @Post("entities/:entityId/sso-connections")
  createSsoConnection(
    @Param("entityId") entityId: string,
    @Body() dto: CreateSsoConnectionDto,
    @CurrentAuthContext() auth: ViewerContext
  ) {
    return this.ssoService.createConnection(entityId, dto, auth);
  }

  @Post("entities/:entityId/sso/:providerName/callback")
  handleSsoCallback(
    @Param("entityId") entityId: string,
    @Param("providerName") providerName: string,
    @Body() dto: SsoCallbackDto
  ) {
    return this.ssoService.handleCallback(entityId, providerName, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, VerificationTierGuard)
  @RequirePermissions("entity.sso.manage")
  @RequireVerificationTier("premium")
  @Post("entities/:entityId/sso-connections/:connectionId/scim-sync")
  requestScimSync(
    @Param("entityId") entityId: string,
    @Param("connectionId") connectionId: string,
    @CurrentAuthContext() auth: ViewerContext
  ) {
    return this.ssoService.requestScimSync(entityId, connectionId, auth);
  }
}
