import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { ViewerContext } from "@ib-marketplace/shared";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { MinVerificationTier } from "../../common/decorators/min-verification-tier.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { VerificationTierGuard } from "../../common/guards/verification-tier.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ComplianceService } from "./compliance.service";
import { StartComplianceCaseDto } from "./dto/start-compliance-case.dto";
import { SubmitComplianceDocumentDto } from "./dto/submit-compliance-document.dto";
import { ReviewComplianceCaseDto } from "./dto/review-compliance-case.dto";
import { RequestReverificationDto } from "./dto/request-reverification.dto";

@ApiTags("compliance")
@Controller()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("entities/:entityId/compliance/workspace")
  getWorkspace(@Param("entityId") entityId: string, @CurrentUser() viewer: ViewerContext) {
    return this.complianceService.getWorkspace(entityId, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("basic")
  @ApiBearerAuth()
  @Post("entities/:entityId/compliance/cases")
  startCase(
    @Param("entityId") entityId: string,
    @Body() dto: StartComplianceCaseDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.complianceService.startCase(entityId, dto, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("basic")
  @ApiBearerAuth()
  @Post("entities/:entityId/compliance/reverification")
  requestReverification(
    @Param("entityId") entityId: string,
    @Body() dto: RequestReverificationDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.complianceService.requestReverification(entityId, dto, viewer);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("entities/:entityId/compliance/cases/:caseId/documents")
  submitDocument(
    @Param("entityId") entityId: string,
    @Param("caseId") caseId: string,
    @Body() dto: SubmitComplianceDocumentDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.complianceService.submitDocument(entityId, caseId, dto, viewer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "compliance_officer")
  @ApiBearerAuth()
  @Post("entities/:entityId/compliance/cases/:caseId/review")
  reviewCase(
    @Param("entityId") entityId: string,
    @Param("caseId") caseId: string,
    @Body() dto: ReviewComplianceCaseDto,
    @CurrentUser() viewer: ViewerContext
  ) {
    return this.complianceService.reviewCase(entityId, caseId, dto, viewer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("super_admin", "compliance_officer")
  @ApiBearerAuth()
  @Get("admin/compliance/queue")
  getAdminQueue(@CurrentUser() viewer: ViewerContext) {
    return this.complianceService.listAdminQueue(viewer);
  }
}
