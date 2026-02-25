import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) { }

  // Saber qué vendió cada seller: /sales?soldByUserId=...
  @Get()
  @RequirePermissions('sales:read')
  list(@Req() req: any, @Query('soldByUserId') soldByUserId?: string) {
    return this.sales.list(req.storeId, { soldByUserId });
  }

  @Post()
  @RequirePermissions('sales:create')
  create(@Req() req: any, @Body() dto: CreateSaleDto) {
    return this.sales.create(req.storeId, req.user.sub, dto);
  }

  @Patch(':id')
  @RequirePermissions('sales:update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSaleDto) {
    return this.sales.update(req.storeId, id, dto);
  }
}
