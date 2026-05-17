import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "./prisma/prisma.service";
import { DomainEventsService } from "./common/infrastructure/domain-events.service";
import { AccessControlService } from "./common/auth/access-control.service";
import { AuthController } from "./modules/auth/auth.controller";
import { AuthService } from "./modules/auth/auth.service";
import { SessionService } from "./modules/auth/session.service";
import { MembershipService } from "./modules/auth/membership.service";
import { SsoService } from "./modules/auth/sso.service";
import { MfaService } from "./modules/auth/mfa.service";
import { LocationsController } from "./modules/locations/locations.controller";
import { LocationsService } from "./modules/locations/locations.service";
import { ComplianceController } from "./modules/compliance/compliance.controller";
import { ComplianceService } from "./modules/compliance/compliance.service";
import { EntitiesController } from "./modules/entities/entities.controller";
import { EntitiesService } from "./modules/entities/entities.service";
import { SecurityController } from "./modules/security/security.controller";
import { SecurityService } from "./modules/security/security.service";
import { ObservabilityController } from "./modules/observability/observability.controller";
import { ObservabilityService } from "./modules/observability/observability.service";

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? "dev-secret" })],
  controllers: [AuthController, LocationsController, ComplianceController, EntitiesController, SecurityController, ObservabilityController],
  providers: [PrismaService, DomainEventsService, AccessControlService, AuthService, SessionService, MembershipService, SsoService, MfaService, LocationsService, ComplianceService, EntitiesService, SecurityService, ObservabilityService]
})
export class AppModule {}
