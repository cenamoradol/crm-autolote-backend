import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';

@Controller('public/stores/:storeSlug/vehicles')
export class PublicController {
  constructor(private readonly pub: PublicService) {}

  @Get()
  list(@Param('storeSlug') storeSlug: string) {
    return this.pub.listVehicles(storeSlug);
  }

  @Get(':publicId')
  get(@Param('storeSlug') storeSlug: string, @Param('publicId') publicId: string) {
    return this.pub.getVehicle(storeSlug, publicId);
  }
}
