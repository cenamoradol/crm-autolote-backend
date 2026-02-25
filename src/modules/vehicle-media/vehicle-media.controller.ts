import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { VehicleMediaService } from './vehicle-media.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ReorderMediaDto } from './dto/reorder-media.dto';
import { UploadManyMediaDto } from './dto/upload-many-media.dto';

@Controller('vehicles/:vehicleId/media')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class VehicleMediaController {
  constructor(private readonly media: VehicleMediaService) { }

  @Get()
  @RequirePermissions('inventory:read')
  list(@Req() req: any, @Param('vehicleId') vehicleId: string) {
    return this.media.list(req.storeId, req.user.sub, vehicleId);
  }

  // ✅ 1 archivo: sube a R2 + registra en BD (conversión a webp)
  @Post('upload')
  @RequirePermissions('inventory:update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 8 * 1024 * 1024 }, // ✅ 8MB por archivo (ajusta aquí)
    }),
  )
  upload(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
  ) {
    return this.media.uploadAndRegister(req.storeId, req.user.sub, vehicleId, file, dto);
  }

  // ✅ VARIOS archivos en 1 request: convierte a webp, sube, registra
  @Post('upload-many')
  @RequirePermissions('inventory:update')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 8 * 1024 * 1024 }, // ✅ 8MB por archivo (ajusta aquí)
    }),
  )
  uploadMany(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadManyMediaDto,
  ) {
    return this.media.uploadManyAndRegister(req.storeId, req.user.sub, vehicleId, files, dto);
  }

  @Patch(':mediaId/cover')
  @RequirePermissions('inventory:update')
  setCover(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.media.setCover(req.storeId, req.user.sub, vehicleId, mediaId);
  }

  @Patch('reorder')
  @RequirePermissions('inventory:update')
  reorder(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: ReorderMediaDto,
  ) {
    return this.media.reorder(req.storeId, req.user.sub, vehicleId, dto.orderedIds);
  }

  @Delete(':mediaId')
  @RequirePermissions('inventory:update')
  remove(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
    @Param('mediaId') mediaId: string,
    @Query('deleteFile') deleteFile?: string,
  ) {
    const shouldDelete = deleteFile !== 'false';
    return this.media.remove(req.storeId, req.user.sub, vehicleId, mediaId, shouldDelete);
  }
}
