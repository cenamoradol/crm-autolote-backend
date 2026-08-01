import { Controller, Get, Param, Query, Post } from '@nestjs/common';
import { PublicService } from './public.service';
import { SearchVehiclesDto } from './dto/search-vehicles.dto';

@Controller('public')
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get('stores/:storeSlug/vehicles')
  list(@Param('storeSlug') storeSlug: string) {
    return this.pub.listVehicles(storeSlug);
  }

  @Get('stores/:storeSlug/vehicles/:publicId')
  get(
    @Param('storeSlug') storeSlug: string,
    @Param('publicId') publicId: string,
  ) {
    return this.pub.getVehicle(storeSlug, publicId);
  }

  @Get('id/:storeId/vehicles')
  listById(@Param('storeId') storeId: string) {
    return this.pub.listVehiclesById(storeId);
  }

  @Get('id/:storeId/vehicles/search')
  searchVehiclesById(
    @Param('storeId') storeId: string,
    @Query() q: SearchVehiclesDto,
  ) {
    return this.pub.searchVehiclesByStoreId(storeId, q);
  }

  @Get('id/:storeId/vehicles/:publicId')
  getById(
    @Param('storeId') storeId: string,
    @Param('publicId') publicId: string,
  ) {
    return this.pub.getVehicleById(storeId, publicId);
  }

  @Get('id/:storeId/clearance')
  listClearanceById(@Param('storeId') storeId: string) {
    return this.pub.listClearanceVehiclesById(storeId);
  }

  @Get('id/:storeId/services')
  listServicesById(
    @Param('storeId') storeId: string,
    @Query('category') category?: string,
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

  @Post('advertisements/:id/impression')
  trackImpression(@Param('id') id: string) {
    return this.pub.trackImpression(id);
  }

  @Post('advertisements/:id/click')
  trackClick(@Param('id') id: string) {
    return this.pub.trackClick(id);
  }

  @Post('advertisements/:id/whatsapp-click')
  trackWhatsappClick(@Param('id') id: string) {
    return this.pub.trackWhatsappClick(id);
  }

  @Post('advertisements/:id/share-click')
  trackShareClick(@Param('id') id: string) {
    return this.pub.trackShareClick(id);
  }

  @Post('id/:storeId/services/:serviceId/whatsapp-click')
  trackServiceWhatsappClick(
    @Param('storeId') storeId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.pub.trackServiceWhatsappClick(storeId, serviceId);
  }

  @Post('id/:storeId/services/:serviceId/share-click')
  trackServiceShareClick(
    @Param('storeId') storeId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.pub.trackServiceShareClick(storeId, serviceId);
  }
}
