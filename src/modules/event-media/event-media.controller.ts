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

import { EventMediaService } from './event-media.service';

@Controller('events/:eventId/media')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class EventMediaController {
  constructor(private readonly media: EventMediaService) {}

  @Get()
  @RequirePermissions('inventory:read')
  list(@Req() req: any, @Param('eventId') eventId: string) {
    return this.media.list(req.storeId, eventId);
  }

  @Post('upload')
  @RequirePermissions('inventory:update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  upload(
    @Req() req: any,
    @Param('eventId') eventId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: { isCover?: boolean; position?: number },
  ) {
    return this.media.uploadAndRegister(req.storeId, eventId, file, dto);
  }

  @Post('upload-many')
  @RequirePermissions('inventory:update')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  uploadMany(
    @Req() req: any,
    @Param('eventId') eventId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: { isCoverFirst?: boolean; startPosition?: number },
  ) {
    return this.media.uploadManyAndRegister(req.storeId, eventId, files, dto);
  }

  @Patch(':mediaId/cover')
  @RequirePermissions('inventory:update')
  setCover(
    @Req() req: any,
    @Param('eventId') eventId: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.media.setCover(req.storeId, eventId, mediaId);
  }

  @Patch('reorder')
  @RequirePermissions('inventory:update')
  reorder(
    @Req() req: any,
    @Param('eventId') eventId: string,
    @Body() body: { orderedIds: string[] },
  ) {
    return this.media.reorder(req.storeId, eventId, body.orderedIds);
  }

  @Delete(':mediaId')
  @RequirePermissions('inventory:update')
  remove(
    @Req() req: any,
    @Param('eventId') eventId: string,
    @Param('mediaId') mediaId: string,
    @Query('deleteFile') deleteFile?: string,
  ) {
    const shouldDelete = deleteFile !== 'false';
    return this.media.remove(req.storeId, eventId, mediaId, shouldDelete);
  }
}
