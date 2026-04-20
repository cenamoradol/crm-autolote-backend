import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../common/r2/r2.service';
import { MediaKind } from '@prisma/client';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service
  ) {}

  async list(storeId: string) {
    return this.prisma.serviceListing.findMany({
      where: { storeId },
      include: { 
        media: { orderBy: { position: 'asc' } },
        category: true 
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(storeId: string, id: string) {
    const service = await this.prisma.serviceListing.findFirst({
      where: { id, storeId },
      include: { media: { orderBy: { position: 'asc' } } },
    });
    if (!service) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Servicio no existe.' });
    return service;
  }

  async create(storeId: string, dto: any) {
    return this.prisma.serviceListing.create({
      data: {
        storeId,
        categoryId: dto.categoryId,
        name: dto.name,
        serviceType: dto.serviceType,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        description: dto.description,
        isPublished: dto.isPublished ?? false,
      },
      include: { media: true, category: true },
    });
  }

  async update(storeId: string, id: string, dto: any) {
    const current = await this.prisma.serviceListing.findFirst({ where: { id, storeId } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Servicio no existe.' });

    return this.prisma.serviceListing.update({
      where: { id },
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        serviceType: dto.serviceType,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        description: dto.description,
        isPublished: typeof dto.isPublished === 'boolean' ? dto.isPublished : undefined,
      },
      include: { media: true, category: true },
    });
  }

  async setPublish(storeId: string, id: string, isPublished: boolean) {
    const current = await this.prisma.serviceListing.findFirst({ where: { id, storeId } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Servicio no existe.' });

    return this.prisma.serviceListing.update({
      where: { id },
      data: { isPublished },
      include: { media: true },
    });
  }

  async delete(storeId: string, id: string) {
    const current = await this.prisma.serviceListing.findFirst({ where: { id, storeId } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Servicio no existe.' });

    await this.prisma.serviceListing.delete({ where: { id } });
    return { ok: true };
  }

  // ─── MEDIA ──────────────────────────────────────────────────

  private buildKey(storeId: string, serviceId: string, kind: MediaKind, ext: string) {
    const id = randomUUID();
    const folder = kind === MediaKind.VIDEO ? 'videos' : 'images';
    return `stores/${storeId}/services/${serviceId}/${folder}/${id}.${ext}`;
  }

  async uploadAndRegister(storeId: string, serviceId: string, file: Express.Multer.File) {
    let processedBuffer = file.buffer;
    let ext = 'webp';
    let contentType = 'image/webp';
    let kind: MediaKind = MediaKind.IMAGE;

    if (!file.mimetype.startsWith('video/')) {
      processedBuffer = await sharp(file.buffer)
        .webp({ quality: 80, effort: 4 })
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .toBuffer();
    } else {
      kind = MediaKind.VIDEO;
      ext = file.originalname.split('.').pop() || 'mp4';
      contentType = file.mimetype;
    }

    const key = this.buildKey(storeId, serviceId, kind, ext);
    await this.r2.uploadObject(key, processedBuffer, contentType);
    const url = this.r2.buildPublicUrl(key);

    const count = await this.prisma.serviceMedia.count({ where: { serviceListingId: serviceId } });

    return this.prisma.serviceMedia.create({
      data: {
        serviceListingId: serviceId,
        kind,
        fileKey: key,
        url,
        position: count,
        isCover: count === 0,
      },
    });
  }

  async uploadManyAndRegister(storeId: string, serviceId: string, files: Express.Multer.File[]) {
    const results: any[] = [];
    for (const file of files) {
      const media = await this.uploadAndRegister(storeId, serviceId, file);
      results.push(media);
    }
    return results;
  }

  async removeMedia(storeId: string, serviceId: string, mediaId: string) {
    const current = await this.prisma.serviceMedia.findFirst({
      where: { id: mediaId, serviceListingId: serviceId },
    });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Imagen no existe.' });

    try {
      await this.r2.deleteObject(current.fileKey);
    } catch (e) {
      console.warn('Could not delete from R2', e);
    }

    await this.prisma.serviceMedia.delete({ where: { id: mediaId } });
    return { ok: true };
  }
}
