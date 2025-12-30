import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';

@Controller()
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard, LicenseGuard)
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  // --------- READ ---------
  @Get('brands')
  listBrands(@Query('q') q?: string) {
    return this.brands.listBrands(q);
  }

  @Get('brands/:brandId/models')
  listModelsByBrand(@Param('brandId') brandId: string, @Query('q') q?: string) {
    return this.brands.listModelsByBrand(brandId, q);
  }

  @Get('models')
  listModels(@Query('q') q?: string, @Query('brandId') brandId?: string) {
    return this.brands.listModels(q, brandId);
  }

  // --------- BRAND WRITE (admin) ---------
  @Post('brands')
  @Roles('admin')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.brands.createBrand(dto.name);
  }

  @Patch('brands/:id')
  @Roles('admin')
  updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.updateBrand(id, dto.name);
  }

  @Delete('brands/:id')
  @Roles('admin')
  deleteBrand(@Param('id') id: string) {
    return this.brands.deleteBrand(id);
  }

  // --------- MODEL WRITE (admin) ---------
  @Post('brands/:brandId/models')
  @Roles('admin')
  createModel(@Param('brandId') brandId: string, @Body() dto: CreateModelDto) {
    return this.brands.createModel(brandId, dto.name);
  }

  @Patch('models/:id')
  @Roles('admin')
  updateModel(@Param('id') id: string, @Body() dto: UpdateModelDto) {
    return this.brands.updateModel(id, { name: dto.name, brandId: dto.brandId });
  }

  @Delete('models/:id')
  @Roles('admin')
  deleteModel(@Param('id') id: string) {
    return this.brands.deleteModel(id);
  }
}
