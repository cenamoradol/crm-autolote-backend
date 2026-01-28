import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';

@Controller()
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  // --------- READ (público / sin store) ---------
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

  // --------- WRITE (solo SuperAdmin) ---------
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('brands')
  createBrand(@Body() dto: CreateBrandDto) {
    return this.brands.createBrand(dto.name);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch('brands/:id')
  updateBrand(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brands.updateBrand(id, dto.name);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Delete('brands/:id')
  deleteBrand(@Param('id') id: string) {
    return this.brands.deleteBrand(id);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post('brands/:brandId/models')
  createModel(@Param('brandId') brandId: string, @Body() dto: CreateModelDto) {
    return this.brands.createModel(brandId, dto.name);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch('models/:id')
  updateModel(@Param('id') id: string, @Body() dto: UpdateModelDto) {
    return this.brands.updateModel(id, { name: dto.name, brandId: dto.brandId });
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Delete('models/:id')
  deleteModel(@Param('id') id: string) {
    return this.brands.deleteModel(id);
  }
}
