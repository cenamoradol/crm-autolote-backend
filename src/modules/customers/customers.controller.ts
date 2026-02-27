import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateCustomerPreferenceDto } from './dto/create-customer-preference.dto';
import { CreateCustomerActivityDto } from './dto/create-customer-activity.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) { }

  @Get()
  @RequirePermissions('customers:read')
  list(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.customers.list(req.storeId, {
      q,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('customers:read')
  get(@Req() req: any, @Param('id') id: string) {
    return this.customers.get(req.storeId, id);
  }

  @Post()
  @RequirePermissions('customers:create')
  create(@Req() req: any, @Body() dto: CreateCustomerDto) {
    return this.customers.create(req.storeId, req.user.sub, dto);
  }

  @Patch(':id')
  @RequirePermissions('customers:update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(req.storeId, req.user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('customers:delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.customers.remove(req.storeId, req.user.sub, id);
  }

  // ── Preferences ──

  @Post(':id/preferences')
  @RequirePermissions('customers:update')
  addPreference(@Req() req: any, @Param('id') id: string, @Body() dto: CreateCustomerPreferenceDto) {
    return this.customers.addPreference(req.storeId, id, dto);
  }

  @Delete(':id/preferences/:prefId')
  @RequirePermissions('customers:update')
  removePreference(@Req() req: any, @Param('id') id: string, @Param('prefId') prefId: string) {
    return this.customers.removePreference(req.storeId, id, prefId);
  }

  @Patch(':id/preferences/:prefId/toggle')
  @RequirePermissions('customers:update')
  togglePreference(@Req() req: any, @Param('id') id: string, @Param('prefId') prefId: string) {
    return this.customers.togglePreference(req.storeId, id, prefId);
  }

  // ── Activities ──

  @Post(':id/activities')
  @RequirePermissions('customers:update')
  addActivity(@Req() req: any, @Param('id') id: string, @Body() dto: CreateCustomerActivityDto) {
    return this.customers.addActivity(req.storeId, req.user.sub, id, dto);
  }

  // ── Status ──

  @Patch(':id/status')
  @RequirePermissions('customers:update')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.customers.updateStatus(req.storeId, id, status);
  }

  // ── Matching Vehicles ──

  @Get(':id/matches')
  @RequirePermissions('customers:read')
  getMatches(@Req() req: any, @Param('id') id: string) {
    return this.customers.getMatchingVehicles(req.storeId, id);
  }
}
