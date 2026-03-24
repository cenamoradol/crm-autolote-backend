import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../common/r2/r2.service';
import { MediaKind, EventMedia } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

@Injectable()
export class EventMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  private async ensureEventInStore(storeId: string, eventId: string) {
    const e = await this.prisma.event.findFirst({
      where: { id: eventId, storeId },
      select: { id: true },
    });
    if (!e) throw new ForbiddenException('EVENT_NOT_IN_STORE');
    return e;
  }

  private buildKey(storeId: string, eventId: string, ext: string) {
    const id = randomUUID();
    return `stores/${storeId}/events/${eventId}/images/${id}.${ext}`;
  }

  private async convertToWebp(input: Buffer) {
    return sharp(input).rotate().webp({ quality: 82 }).toBuffer();
  }

  async list(storeId: string, eventId: string) {
    await this.ensureEventInStore(storeId, eventId);

    const data = await this.prisma.eventMedia.findMany({
      where: { eventId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return { data };
  }

  async uploadAndRegister(
    storeId: string,
    eventId: string,
    file: Express.Multer.File,
    dto: { isCover?: boolean; position?: number },
  ) {
    await this.ensureEventInStore(storeId, eventId);

    if (!file || !file.buffer?.length) throw new ForbiddenException('FILE_REQUIRED');

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedImages.includes(file.mimetype)) {
      throw new ForbiddenException('UNSUPPORTED_IMAGE_TYPE');
    }

    const uploadBuffer = await this.convertToWebp(file.buffer);
    const fileKey = this.buildKey(storeId, eventId, 'webp');

    await this.r2.uploadObject(fileKey, uploadBuffer, 'image/webp');
    const url = this.r2.buildPublicUrl(fileKey);

    const nextPos =
      dto.position ??
      ((await this.prisma.eventMedia.aggregate({
        where: { eventId },
        _max: { position: true },
      }))._max.position ?? -1) + 1;

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCover) {
        await tx.eventMedia.updateMany({
          where: { eventId, isCover: true },
          data: { isCover: false },
        });
      }

      return tx.eventMedia.create({
        data: {
          eventId,
          kind: MediaKind.IMAGE,
          fileKey,
          url,
          position: nextPos,
          isCover: !!dto.isCover,
        },
      });
    });
  }

  async uploadManyAndRegister(
    storeId: string,
    eventId: string,
    files: Express.Multer.File[],
    dto: { isCoverFirst?: boolean; startPosition?: number },
  ) {
    await this.ensureEventInStore(storeId, eventId);

    if (!files?.length) throw new ForbiddenException('FILES_REQUIRED');

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
    for (const f of files) {
      if (!f.buffer?.length) throw new ForbiddenException('FILE_REQUIRED');
      if (!allowedImages.includes(f.mimetype)) throw new ForbiddenException('UNSUPPORTED_IMAGE_TYPE');
    }

    const maxPos = (await this.prisma.eventMedia.aggregate({
      where: { eventId },
      _max: { position: true },
    }))._max.position ?? -1;

    const startPos = dto.startPosition ?? maxPos + 1;
    const uploadedKeys: string[] = [];
    const items: { fileKey: string; url: string; position: number; isCover: boolean }[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const webpBuffer = await this.convertToWebp(files[i].buffer);
        const fileKey = this.buildKey(storeId, eventId, 'webp');

        await this.r2.uploadObject(fileKey, webpBuffer, 'image/webp');
        uploadedKeys.push(fileKey);

        items.push({
          fileKey,
          url: this.r2.buildPublicUrl(fileKey),
          position: startPos + i,
          isCover: !!dto.isCoverFirst && i === 0,
        });
      }

      const created = await this.prisma.$transaction(async (tx) => {
        if (dto.isCoverFirst) {
          await tx.eventMedia.updateMany({
            where: { eventId, isCover: true },
            data: { isCover: false },
          });
        }

        const results: EventMedia[] = [];
        for (const item of items) {
          const row = await tx.eventMedia.create({
            data: {
              eventId,
              kind: MediaKind.IMAGE,
              fileKey: item.fileKey,
              url: item.url,
              position: item.position,
              isCover: item.isCover,
            },
          });
          results.push(row);
        }
        return results;
      });

      return { ok: true, count: created.length, data: created };
    } catch (e) {
      for (const key of uploadedKeys) {
        try { await this.r2.deleteObject(key); } catch {}
      }
      throw e;
    }
  }

  async setCover(storeId: string, eventId: string, mediaId: string) {
    await this.ensureEventInStore(storeId, eventId);

    const media = await this.prisma.eventMedia.findFirst({
      where: { id: mediaId, eventId },
      select: { id: true },
    });
    if (!media) throw new NotFoundException('MEDIA_NOT_FOUND');

    return this.prisma.$transaction(async (tx) => {
      await tx.eventMedia.updateMany({
        where: { eventId, isCover: true },
        data: { isCover: false },
      });
      return tx.eventMedia.update({
        where: { id: mediaId },
        data: { isCover: true },
      });
    });
  }

  async reorder(storeId: string, eventId: string, orderedIds: string[]) {
    await this.ensureEventInStore(storeId, eventId);

    const count = await this.prisma.eventMedia.count({
      where: { eventId, id: { in: orderedIds } },
    });
    if (count !== orderedIds.length) throw new ForbiddenException('INVALID_MEDIA_IDS');

    await this.prisma.$transaction(
      orderedIds.map((id, idx) =>
        this.prisma.eventMedia.update({
          where: { id },
          data: { position: idx },
        }),
      ),
    );

    const data = await this.prisma.eventMedia.findMany({
      where: { eventId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return { ok: true, data };
  }

  async remove(storeId: string, eventId: string, mediaId: string, deleteFile: boolean) {
    await this.ensureEventInStore(storeId, eventId);

    const media = await this.prisma.eventMedia.findFirst({
      where: { id: mediaId, eventId },
      select: { id: true, fileKey: true, isCover: true },
    });
    if (!media) throw new NotFoundException('MEDIA_NOT_FOUND');

    await this.prisma.eventMedia.delete({ where: { id: mediaId } });

    if (deleteFile) {
      await this.r2.deleteObject(media.fileKey);
    }

    if (media.isCover) {
      const first = await this.prisma.eventMedia.findFirst({
        where: { eventId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });
      if (first) {
        await this.prisma.eventMedia.update({
          where: { id: first.id },
          data: { isCover: true },
        });
      }
    }

    return { ok: true };
  }
}
