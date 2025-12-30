import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard, LicenseGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  // Saber qué vendió cada seller: /sales?soldByUserId=...
  @Get()
  list(@Req() req: any, @Query('soldByUserId') soldByUserId?: string) {
    return this.sales.list(req.storeId, { soldByUserId });
  }

  @Post()
  @Roles('admin', 'supervisor', 'seller')
  create(@Req() req: any, @Body() dto: CreateSaleDto) {
    return this.sales.create(req.storeId, req.user.sub, dto);
  }
}
