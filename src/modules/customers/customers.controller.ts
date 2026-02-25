import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

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
}
