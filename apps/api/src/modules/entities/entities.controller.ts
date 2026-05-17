import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards
} from "@nestjs/common";
import type { ViewerContext } from "@ib-marketplace/shared";
import { JwtAuthGuard } from "../../common/auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/auth/decorators/current-user.decorator";
import { EntitiesService } from "./entities.service";
import { UpsertEntityProfileDto } from "./dto/upsert-entity-profile.dto";
import { UpdateMembershipDto } from "./dto/update-membership.dto";
import { CreateOrganizationUnitDto } from "./dto/create-organization-unit.dto";
import { UpdateOrganizationUnitDto } from "./dto/update-organization-unit.dto";
import { CreateCertificationDto } from "./dto/create-certification.dto";
import { UpsertAuthorityProfileDto } from "./dto/upsert-authority-profile.dto";

@UseGuards(JwtAuthGuard)
@Controller("entities/:entityId")
export class EntitiesController {
  constructor(private readonly entitiesService: EntitiesService) {}

  @Get("workspace")
  getWorkspace(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.entitiesService.getWorkspace(entityId, viewer);
  }

  @Get("profile")
  getProfile(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.entitiesService.getProfile(entityId, viewer);
  }

  @Patch("profile")
  upsertProfile(
    @Param("entityId") entityId: string,
    @Body() dto: UpsertEntityProfileDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.entitiesService.upsertProfile(entityId, dto, viewer);
  }

  @Get("team")
  listTeam(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.entitiesService.listTeam(entityId, viewer);
  }

  @Patch("team/:membershipId")
  updateMembership(
    @Param("entityId") entityId: string,
    @Param("membershipId") membershipId: string,
    @Body() dto: UpdateMembershipDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.entitiesService.updateMembership(entityId, membershipId, dto, viewer);
  }

  @Delete("team/:membershipId")
  removeMembership(
    @Param("entityId") entityId: string,
    @Param("membershipId") membershipId: string,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.entitiesService.removeMembership(entityId, membershipId, viewer);
  }

  @Get("units")
  listUnits(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.entitiesService.listUnits(entityId, viewer);
  }

  @Post("units")
  createUnit(
    @Param("entityId") entityId: string,
    @Body() dto: CreateOrganizationUnitDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.entitiesService.createUnit(entityId, dto, viewer);
  }

  @Patch("units/:unitId")
  updateUnit(
    @Param("entityId") entityId: string,
    @Param("unitId") unitId: string,
    @Body() dto: UpdateOrganizationUnitDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.entitiesService.updateUnit(entityId, unitId, dto, viewer);
  }

  @Get("certifications")
  listCertifications(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.entitiesService.listCertifications(entityId, viewer);
  }

  @Post("certifications")
  addCertification(
    @Param("entityId") entityId: string,
    @Body() dto: CreateCertificationDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.entitiesService.addCertification(entityId, dto, viewer);
  }

  @Get("trust-score")
  getTrustScore(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.entitiesService.getTrustScore(entityId, viewer);
  }

  @Post("trust-score/recalculate")
  recalculateTrustScore(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.entitiesService.recalculateTrustScore(entityId, viewer);
  }

  @Get("authority-profile")
  getAuthorityProfile(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.entitiesService.getAuthorityProfile(entityId, viewer);
  }

  @Put("authority-profile")
  upsertAuthorityProfile(
    @Param("entityId") entityId: string,
    @Body() dto: UpsertAuthorityProfileDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.entitiesService.upsertAuthorityProfile(entityId, dto, viewer);
  }
}
