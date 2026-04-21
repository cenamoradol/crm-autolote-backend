import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../common/r2/r2.service';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { MediaKind } from '@prisma/client';

@Injectable()
export class AdvertisementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  private buildKey(storeId: string, extension: string = 'webp') {
    const id = randomUUID();
    return `stores/${storeId}/advertisements/${id}.${extension}`;
  }

  private async convertToWebp(input: Buffer) {
    return sharp(input).rotate().webp({ quality: 82 }).toBuffer();
  }

  async uploadAndCreate(storeId: string, file: Express.Multer.File, dto: CreateAdvertisementDto) {
    if (!file || !file.buffer?.length) throw new ForbiddenException('FILE_REQUIRED');

    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    
    let imageUrl: string;
    let kind: MediaKind = MediaKind.IMAGE;

    if (file.mimetype === 'image/gif') {
      const fileKey = this.buildKey(storeId, 'gif');
      await this.r2.uploadObject(fileKey, file.buffer, 'image/gif');
      imageUrl = this.r2.buildPublicUrl(fileKey);
      kind = MediaKind.IMAGE;
    } else if (imageTypes.includes(file.mimetype)) {
      const webpBuffer = await this.convertToWebp(file.buffer);
      const fileKey = this.buildKey(storeId, 'webp');
      await this.r2.uploadObject(fileKey, webpBuffer, 'image/webp');
      imageUrl = this.r2.buildPublicUrl(fileKey);
      kind = MediaKind.IMAGE;
    } else if (videoTypes.includes(file.mimetype)) {
      const ext = file.originalname.split('.').pop() || 'mp4';
      const fileKey = this.buildKey(storeId, ext);
      await this.r2.uploadObject(fileKey, file.buffer, file.mimetype);
      imageUrl = this.r2.buildPublicUrl(fileKey);
      kind = MediaKind.VIDEO;
    } else {
      throw new ForbiddenException('UNSUPPORTED_FILE_TYPE');
    }

    return this.prisma.advertisement.create({
      data: {
        storeId,
        imageUrl,
        kind,
        title: dto.title,
        targetUrl: dto.targetUrl,
        placement: dto.placement,
        isActive: dto.isActive ?? true,
        position: dto.position ?? 0,
      },
    });
  }

  async uploadAndUpdate(storeId: string, id: string, file: Express.Multer.File, dto: UpdateAdvertisementDto) {
    const existing = await this.findOne(storeId, id);

    let imageUrl = existing.imageUrl;
    let kind = existing.kind;

    if (file && file.buffer?.length) {
      const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];

      if (file.mimetype === 'image/gif') {
        const fileKey = this.buildKey(storeId, 'gif');
        await this.r2.uploadObject(fileKey, file.buffer, 'image/gif');
        imageUrl = this.r2.buildPublicUrl(fileKey);
        kind = MediaKind.IMAGE;
      } else if (imageTypes.includes(file.mimetype)) {
        const webpBuffer = await this.convertToWebp(file.buffer);
        const fileKey = this.buildKey(storeId, 'webp');
        await this.r2.uploadObject(fileKey, webpBuffer, 'image/webp');
        imageUrl = this.r2.buildPublicUrl(fileKey);
        kind = MediaKind.IMAGE;
      } else if (videoTypes.includes(file.mimetype)) {
        const ext = file.originalname.split('.').pop() || 'mp4';
        const fileKey = this.buildKey(storeId, ext);
        await this.r2.uploadObject(fileKey, file.buffer, file.mimetype);
        imageUrl = this.r2.buildPublicUrl(fileKey);
        kind = MediaKind.VIDEO;
      } else {
        throw new ForbiddenException('UNSUPPORTED_FILE_TYPE');
      }
    }

    return this.prisma.advertisement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.targetUrl !== undefined && { targetUrl: dto.targetUrl }),
        ...(dto.placement !== undefined && { placement: dto.placement }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.position !== undefined && { position: dto.position }),
        imageUrl,
        kind,
      },
    });
  }

  async create(storeId: string, dto: CreateAdvertisementDto) {
    if (!dto.imageUrl) {
      throw new ForbiddenException('IMAGE_URL_REQUIRED');
    }
    return this.prisma.advertisement.create({
      data: {
        storeId,
        imageUrl: dto.imageUrl,
        kind: dto.kind || MediaKind.IMAGE,
        title: dto.title,
        targetUrl: dto.targetUrl,
        placement: dto.placement,
        isActive: dto.isActive ?? true,
        position: dto.position ?? 0,
      },
    });
  }

  async findAll(storeId: string) {
    return this.prisma.advertisement.findMany({
      where: { storeId },
      orderBy: [{ placement: 'asc' }, { position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(storeId: string, id: string) {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id },
    });
    if (!ad || ad.storeId !== storeId) {
      throw new NotFoundException('Publicidad no encontrada.');
    }
    return ad;
  }

  async update(storeId: string, id: string, dto: UpdateAdvertisementDto) {
    await this.findOne(storeId, id);

    return this.prisma.advertisement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.kind !== undefined && { kind: dto.kind }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.targetUrl !== undefined && { targetUrl: dto.targetUrl }),
        ...(dto.placement !== undefined && { placement: dto.placement }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });
  }

  async remove(storeId: string, id: string) {
    await this.findOne(storeId, id);

    return this.prisma.advertisement.delete({
      where: { id },
    });
  }
}
