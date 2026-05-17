import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { MinVerificationTier } from "../../common/decorators/min-verification-tier.decorator";
import { VerificationTierGuard } from "../../common/guards/verification-tier.guard";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { NearbySearchDto } from "./dto/nearby-search.dto";
import { ConfirmPostcardDto } from "./dto/confirm-postcard.dto";
import { MapSearchDto } from "./dto/map-search.dto";
import { ListLocationReviewQueueDto } from "./dto/list-location-review-queue.dto";
import { ResolveLocationReviewDto } from "./dto/resolve-location-review.dto";
import { LocationsService } from "./locations.service";

@ApiTags("locations")
@Controller()
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("entities/:id/locations")
  getEntityLocations(@Param("id") entityId: string, @CurrentUser() viewer: any) {
    return this.locationsService.findEntityLocations(entityId, viewer);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("entities/:id/locations/:locId")
  getLocation(
    @Param("id") entityId: string,
    @Param("locId") locationId: string,
    @CurrentUser() viewer: any
  ) {
    return this.locationsService.getLocation(entityId, locationId, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("standard")
  @ApiBearerAuth()
  @Post("entities/:id/locations")
  createLocation(
    @Param("id") entityId: string,
    @Body() dto: CreateLocationDto,
    @CurrentUser() viewer: any
  ) {
    return this.locationsService.createLocation(entityId, dto, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("standard")
  @ApiBearerAuth()
  @Patch("entities/:id/locations/:locId")
  updateLocation(
    @Param("id") entityId: string,
    @Param("locId") locationId: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() viewer: any
  ) {
    return this.locationsService.updateLocation(entityId, locationId, dto, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("standard")
  @ApiBearerAuth()
  @Delete("entities/:id/locations/:locId")
  deleteLocation(
    @Param("id") entityId: string,
    @Param("locId") locationId: string,
    @CurrentUser() viewer: any
  ) {
    return this.locationsService.deleteLocation(entityId, locationId, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("standard")
  @ApiBearerAuth()
  @Patch("entities/:id/locations/:locId/primary")
  setPrimary(
    @Param("id") entityId: string,
    @Param("locId") locationId: string,
    @CurrentUser() viewer: any
  ) {
    return this.locationsService.setPrimary(entityId, locationId, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("standard")
  @ApiBearerAuth()
  @Post("entities/:id/locations/:locId/verify/postcard")
  requestPostcard(
    @Param("id") entityId: string,
    @Param("locId") locationId: string,
    @CurrentUser() viewer: any
  ) {
    return this.locationsService.requestPostcardVerification(entityId, locationId, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("standard")
  @ApiBearerAuth()
  @Post("entities/:id/locations/:locId/verify/postcard/confirm")
  confirmPostcard(
    @Param("id") entityId: string,
    @Param("locId") locationId: string,
    @Body() dto: ConfirmPostcardDto,
    @CurrentUser() viewer: any
  ) {
    return this.locationsService.confirmPostcard(entityId, locationId, dto.code, viewer);
  }

  @UseGuards(JwtAuthGuard, VerificationTierGuard)
  @MinVerificationTier("standard")
  @ApiBearerAuth()
  @Post("entities/:id/locations/:locId/verify/document")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  uploadVerificationDocument(
    @Param("id") entityId: string,
    @Param("locId") locationId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() viewer: any
  ) {
    const documentUrl = file?.originalname
      ? `s3://ib-marketplace/location-verification/${file.originalname}`
      : "s3://ib-marketplace/location-verification/manual-placeholder.pdf";
    return this.locationsService.requestDocumentVerification(entityId, locationId, viewer, documentUrl);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("marketplace/search/suppliers/nearby")
  nearbySearch(@Query() dto: NearbySearchDto, @CurrentUser() viewer: any) {
    return this.locationsService.searchNearby(dto, viewer);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("marketplace/search/suppliers/map")
  mapSearch(@Query() dto: MapSearchDto, @CurrentUser() viewer: any) {
    return this.locationsService.mapSearch(dto, viewer);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("marketplace/entities/:id/footprint")
  supplierFootprint(@Param("id") entityId: string, @CurrentUser() viewer: any) {
    return this.locationsService.getSupplierFootprint(entityId, viewer);
  }

  @Get("marketplace/listings/:id/delivery-coverage")
  deliveryCoverage(@Param("id") listingId: string) {
    return this.locationsService.getDeliveryCoverage(listingId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get("admin/location-reviews")
  listAdminReviewQueue(@Query() dto: ListLocationReviewQueueDto, @CurrentUser() viewer: any) {
    return this.locationsService.listAdminReviewQueue(dto, viewer);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch("admin/location-reviews/:reviewId")
  resolveAdminReview(
    @Param("reviewId") reviewId: string,
    @Body() dto: ResolveLocationReviewDto,
    @CurrentUser() viewer: any
  ) {
    return this.locationsService.resolveAdminReview(reviewId, dto, viewer);
  }
}
