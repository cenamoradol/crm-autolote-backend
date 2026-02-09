import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard, LicenseGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) { }

  @Get()
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
  get(@Req() req: any, @Param('id') id: string) {
    return this.customers.get(req.storeId, id);
  }

  @Post()
  @Roles('admin', 'supervisor', 'seller')
  create(@Req() req: any, @Body() dto: CreateCustomerDto) {
    return this.customers.create(req.storeId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('admin', 'supervisor', 'seller')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(req.storeId, req.user.sub, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'supervisor')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.customers.remove(req.storeId, req.user.sub, id);
  }
}
