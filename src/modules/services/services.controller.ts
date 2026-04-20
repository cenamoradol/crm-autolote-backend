import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, UploadedFiles, Req } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';

@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  async list(@Req() req: any) {
    return this.servicesService.list(req.storeId);
  }

  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    return this.servicesService.getById(req.storeId, id);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: any) {
    return this.servicesService.create(req.storeId, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.servicesService.update(req.storeId, id, dto);
  }

  @Patch(':id/publish')
  async setPublish(
    @Req() req: any,
    @Param('id') id: string,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.servicesService.setPublish(req.storeId, id, isPublished);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.servicesService.delete(req.storeId, id);
  }

  // ─── MEDIA ENDPOINTS ──────────────────────────────────────────────────

  @Post(':id/media/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.servicesService.uploadAndRegister(req.storeId, id, file);
  }

  @Post(':id/media/upload-many')
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadMany(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.servicesService.uploadManyAndRegister(req.storeId, id, files);
  }

  @Delete(':id/media/:mediaId')
  async removeMedia(
    @Req() req: any,
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.servicesService.removeMedia(req.storeId, id, mediaId);
  }
}
