// apps/api/src/modules/location/location.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  Query, UseGuards, Request, ParseUUIDPipe, HttpCode,
  HttpStatus, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerificationTierGuard } from '../../common/guards/verification-tier.guard';
import { RequiresTier } from '../../common/decorators/requires-tier.decorator';
import { LocationService } from './location.service';
import { GeoSearchService } from './geo-search.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { ConfirmPostcardDto } from './dto/confirm-postcard.dto';
import { NearbySearchDto } from './dto/nearby-search.dto';
import { MapBboxSearchDto } from './dto/map-bbox-search.dto';

@ApiTags('location')
@ApiBearerAuth()
@Controller({ path: 'entities/:entityId/locations', version: '1' })
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly geoSearchService: GeoSearchService,
  ) {}

  // ── LIST ENTITY LOCATIONS ───────────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Get all locations for an entity (respects viewer access level)' })
  async findAll(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Request() req: any,
  ) {
    return this.locationService.findAllForEntity(entityId, req.user);
  }

  // ── CREATE LOCATION ─────────────────────────────────────────────────────────
  @Post()
  @RequiresTier('standard')
  @UseGuards(VerificationTierGuard)
  @ApiOperation({ summary: 'Add a new location (triggers async geocoding)' })
  async create(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: CreateLocationDto,
    @Request() req: any,
  ) {
    return this.locationService.create(entityId, dto, req.user);
  }

  // ── GET SINGLE LOCATION ─────────────────────────────────────────────────────
  @Get(':locId')
  async findOne(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('locId', ParseUUIDPipe) locId: string,
    @Request() req: any,
  ) {
    return this.locationService.findOne(entityId, locId, req.user);
  }

  // ── UPDATE LOCATION ─────────────────────────────────────────────────────────
  @Patch(':locId')
  @ApiOperation({ summary: 'Update location visibility, delivery settings, or address' })
  async update(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('locId', ParseUUIDPipe) locId: string,
    @Body() dto: UpdateLocationDto,
    @Request() req: any,
  ) {
    return this.locationService.update(entityId, locId, dto, req.user);
  }

  // ── DELETE LOCATION (soft) ──────────────────────────────────────────────────
  @Delete(':locId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('locId', ParseUUIDPipe) locId: string,
    @Request() req: any,
  ) {
    return this.locationService.softDelete(entityId, locId, req.user);
  }

  // ── SET AS PRIMARY ──────────────────────────────────────────────────────────
  @Patch(':locId/primary')
  @ApiOperation({ summary: 'Set this location as the entity primary location' })
  async setPrimary(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('locId', ParseUUIDPipe) locId: string,
    @Request() req: any,
  ) {
    return this.locationService.setPrimary(entityId, locId, req.user);
  }

  // ── VERIFICATION: REQUEST POSTCARD ──────────────────────────────────────────
  @Post(':locId/verify/postcard')
  @ApiOperation({ summary: 'Request physical postcard verification via Lob.com' })
  async requestPostcard(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('locId', ParseUUIDPipe) locId: string,
    @Request() req: any,
  ) {
    return this.locationService.requestPostcardVerification(entityId, locId, req.user);
  }

  // ── VERIFICATION: CONFIRM POSTCARD CODE ────────────────────────────────────
  @Post(':locId/verify/postcard/confirm')
  @ApiOperation({ summary: 'Enter the code received on the physical postcard' })
  async confirmPostcard(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('locId', ParseUUIDPipe) locId: string,
    @Body() dto: ConfirmPostcardDto,
    @Request() req: any,
  ) {
    return this.locationService.confirmPostcard(entityId, locId, dto.code, req.user);
  }

  // ── VERIFICATION: DOCUMENT UPLOAD ──────────────────────────────────────────
  @Post(':locId/verify/document')
  @UseInterceptors(FileInterceptor('document'))
  @ApiOperation({ summary: 'Upload verification document (utility bill, lease agreement)' })
  async uploadDocument(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Param('locId', ParseUUIDPipe) locId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.locationService.submitDocumentVerification(entityId, locId, file, req.user);
  }
}

// ── GEO SEARCH CONTROLLER ────────────────────────────────────────────────────

@ApiTags('location')
@ApiBearerAuth()
@Controller({ path: 'marketplace/search', version: '1' })
@UseGuards(JwtAuthGuard)
export class GeoSearchController {
  constructor(private readonly geoSearchService: GeoSearchService) {}

  // ── PROXIMITY SEARCH ────────────────────────────────────────────────────────
  @Get('suppliers/nearby')
  @ApiOperation({ summary: 'Find verified suppliers within radius of a point' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radius_km', required: true, type: Number })
  @ApiQuery({ name: 'location_type', required: false })
  @ApiQuery({ name: 'category_id', required: false, type: Number })
  @ApiQuery({ name: 'country_code', required: false })
  @ApiQuery({ name: 'verified_only', required: false, type: Boolean })
  async nearbySuppliers(
    @Query() query: NearbySearchDto,
    @Request() req: any,
  ) {
    return this.geoSearchService.findNearbySuppliers(query, req.user);
  }

  // ── MAP VIEWPORT SEARCH ─────────────────────────────────────────────────────
  @Get('suppliers/map')
  @ApiOperation({ summary: 'Get supplier location pins within a map bounding box' })
  @ApiQuery({ name: 'bbox', required: true, description: 'SW_lat,SW_lng,NE_lat,NE_lng' })
  async mapViewport(
    @Query() query: MapBboxSearchDto,
    @Request() req: any,
  ) {
    return this.geoSearchService.findInBoundingBox(query, req.user);
  }

  // ── DELIVERY COVERAGE ───────────────────────────────────────────────────────
  @Get('listings/:listingId/delivery-coverage')
  @ApiOperation({ summary: 'Get GeoJSON delivery coverage for a listing' })
  async deliveryCoverage(
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ) {
    return this.geoSearchService.getDeliveryCoverage(listingId);
  }
}
