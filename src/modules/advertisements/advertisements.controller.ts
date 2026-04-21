import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdvertisementsService } from './advertisements.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard)
@Controller('advertisements')
export class AdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Post('upload')
  @RequirePermissions('store_settings:update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  uploadImage(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateAdvertisementDto,
  ) {
    return this.advertisementsService.uploadAndCreate(req.storeId, file, body);
  }

  @Patch(':id/upload')
  @RequirePermissions('store_settings:update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAndUpdate(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UpdateAdvertisementDto,
  ) {
    return this.advertisementsService.uploadAndUpdate(req.storeId, id, file, body);
  }

  @Post()
  @RequirePermissions('store_settings:update')
  create(@Req() req: any, @Body() createAdvertisementDto: CreateAdvertisementDto) {
    return this.advertisementsService.create(req.storeId, createAdvertisementDto);
  }

  @Get()
  @RequirePermissions('store_settings:read')
  findAll(@Req() req: any) {
    return this.advertisementsService.findAll(req.storeId);
  }

  @Get(':id')
  @RequirePermissions('store_settings:read')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.advertisementsService.findOne(req.storeId, id);
  }

  @Patch(':id')
  @RequirePermissions('store_settings:update')
  update(@Req() req: any, @Param('id') id: string, @Body() updateAdvertisementDto: UpdateAdvertisementDto) {
    return this.advertisementsService.update(req.storeId, id, updateAdvertisementDto);
  }

  @Delete(':id')
  @RequirePermissions('store_settings:update')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.advertisementsService.remove(req.storeId, id);
  }
}
