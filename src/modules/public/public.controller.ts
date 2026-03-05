import { Controller, Get, Param } from '@nestjs/common';
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
}
