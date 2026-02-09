import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard, LicenseGuard)
export class SalesController {
  constructor(private readonly sales: SalesService) { }

  // Saber qué vendió cada seller: /sales?soldByUserId=...
  @Get()
  list(@Req() req: any, @Query('soldByUserId') soldByUserId?: string) {
    return this.sales.list(req.storeId, { soldByUserId });
  }

  @Post()
  @Roles('admin', 'supervisor')
  create(@Req() req: any, @Body() dto: CreateSaleDto) {
    return this.sales.create(req.storeId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('admin', 'supervisor')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateSaleDto) {
    return this.sales.update(req.storeId, id, dto);
  }
}
