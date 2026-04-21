import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly pub: PublicService) { }

  @Get('stores/:storeSlug/vehicles')
  list(@Param('storeSlug') storeSlug: string) {
    return this.pub.listVehicles(storeSlug);
  }

  @Get('stores/:storeSlug/vehicles/:publicId')
  get(@Param('storeSlug') storeSlug: string, @Param('publicId') publicId: string) {
    return this.pub.getVehicle(storeSlug, publicId);
  }

  @Get('id/:storeId/vehicles')
  listById(@Param('storeId') storeId: string) {
    return this.pub.listVehiclesById(storeId);
  }

  @Get('id/:storeId/vehicles/:publicId')
  getById(@Param('storeId') storeId: string, @Param('publicId') publicId: string) {
    return this.pub.getVehicleById(storeId, publicId);
  }

  @Get('id/:storeId/clearance')
  listClearanceById(@Param('storeId') storeId: string) {
    return this.pub.listClearanceVehiclesById(storeId);
  }

  @Get('id/:storeId/services')
  listServicesById(
    @Param('storeId') storeId: string,
    @Query('category') category?: string
  ) {
    return this.pub.listServicesById(storeId, category);
  }

  @Get('id/:storeId/service-categories')
  listServiceCategoriesById(@Param('storeId') storeId: string) {
    return this.pub.listServiceCategoriesById(storeId);
  }

  // ─── Events (public) ──────────────────────────────────────

  @Get('stores/:storeSlug/event-categories')
  listEventCategories(@Param('storeSlug') storeSlug: string) {
    return this.pub.listEventCategories(storeSlug);
  }

  @Get('stores/:storeSlug/event-categories/:categorySlug/events')
  listCategoryEvents(
    @Param('storeSlug') storeSlug: string,
    @Param('categorySlug') categorySlug: string,
  ) {
    return this.pub.listCategoryEvents(storeSlug, categorySlug);
  }

  @Get('id/:storeId/event-categories/:categorySlug/events')
  listCategoryEventsById(
    @Param('storeId') storeId: string,
    @Param('categorySlug') categorySlug: string,
  ) {
    return this.pub.listCategoryEventsById(storeId, categorySlug);
  }

  @Get('stores/:storeSlug/events/:eventSlug')
  getEvent(
    @Param('storeSlug') storeSlug: string,
    @Param('eventSlug') eventSlug: string,
  ) {
    return this.pub.getEvent(storeSlug, eventSlug);
  }

  // ─── Advertisements ─────────────────────────────────────────

  @Get('id/:storeId/advertisements')
  listAdvertisementsById(@Param('storeId') storeId: string) {
    return this.pub.listAdvertisementsById(storeId);
  }
}

