import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { CreateSaleDocumentDto } from './dto/create-sale-document.dto';

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
    return this.sales.update(req.storeId, id, req.user.sub, dto);
  }

  // -------- Documents --------
  @Post(':id/documents')
  @RequirePermissions('sales:update')
  addDocument(@Req() req: any, @Param('id') id: string, @Body() dto: CreateSaleDocumentDto) {
    return this.sales.addDocument(req.storeId, id, req.user.sub, dto);
  }

  @Delete(':id/documents/:docId')
  @RequirePermissions('sales:update')
  removeDocument(@Req() req: any, @Param('id') id: string, @Param('docId') docId: string) {
    return this.sales.removeDocument(req.storeId, id, req.user.sub, docId);
  }

  @Post(':id/documents/upload')
  @RequirePermissions('sales:update')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return this.sales.uploadDocument(req.storeId, id, req.user.sub, file);
  }
}
