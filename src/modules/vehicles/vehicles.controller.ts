import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleStatus } from '@prisma/client';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) { }

  @Get()
  @RequirePermissions('inventory:read')
  list(
    @Req() req: any,
    @Query('status') status?: VehicleStatus,
    @Query('published') published?: string,
    @Query('search') search?: string,
  ) {
    return this.vehicles.list(req.storeId, { status, published, search });
  }

  @Get(':id')
  @RequirePermissions('inventory:read')
  get(@Req() req: any, @Param('id') id: string) {
    return this.vehicles.get(req.storeId, id);
  }

  @Post()
  @RequirePermissions('inventory:create')
  create(@Req() req: any, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(req.storeId, req.user.sub, dto);
  }

  @Patch(':id')
  @RequirePermissions('inventory:update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(req.storeId, req.user.sub, id, dto);
  }

  @Patch(':id/publish')
  @RequirePermissions('inventory:update')
  publish(@Req() req: any, @Param('id') id: string, @Body() body: { isPublished: boolean }) {
    return this.vehicles.setPublish(req.storeId, req.user.sub, id, !!body?.isPublished);
  }

  @Delete(':id')
  @RequirePermissions('inventory:delete')
  archive(@Req() req: any, @Param('id') id: string) {
    return this.vehicles.archive(req.storeId, req.user.sub, id);
  }
}
