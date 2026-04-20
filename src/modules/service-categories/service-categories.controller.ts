import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { ServiceCategoriesService } from './service-categories.service';

@Controller('service-categories')
@UseGuards(JwtAuthGuard, StoreContextGuard)
export class ServiceCategoriesController {
  constructor(private readonly categoriesService: ServiceCategoriesService) {}

  @Get()
  async list(@Req() req: any) {
    return this.categoriesService.list(req.storeId);
  }

  @Post()
  async create(@Req() req: any, @Body('name') name: string) {
    return this.categoriesService.create(req.storeId, name);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body('name') name: string) {
    return this.categoriesService.update(req.storeId, id, name);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.categoriesService.delete(req.storeId, id);
  }
}
