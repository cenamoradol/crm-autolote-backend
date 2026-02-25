import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../common/r2/r2.service';
import { MediaKind, VehicleMedia } from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

@Injectable()
export class VehicleMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) { }

  private async verifyUserInStore(userId: string, storeId: string): Promise<void> {
    const membership = await this.prisma.userRole.findFirst({
      where: { userId, storeId },
      select: { id: true },
    });

    if (!membership) throw new ForbiddenException('STORE_ACCESS_DENIED');
  }

  private async ensureVehicleInStore(storeId: string, vehicleId: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, storeId },
      select: { id: true },
    });
    if (!v) throw new ForbiddenException('VEHICLE_NOT_IN_STORE');
  }

  private normalizeKind(kind?: string, mimetype?: string): MediaKind {
    if (kind) {
      const k = kind.toUpperCase();
      return k === 'VIDEO' ? MediaKind.VIDEO : MediaKind.IMAGE;
    }
    if (mimetype?.startsWith('video/')) return MediaKind.VIDEO;
    return MediaKind.IMAGE;
  }

  private buildKey(storeId: string, vehicleId: string, kind: MediaKind, ext: string) {
    const id = randomUUID();
    const folder = kind === MediaKind.VIDEO ? 'videos' : 'images';
    return `stores/${storeId}/vehicles/${vehicleId}/${folder}/${id}.${ext}`;
  }

  private async convertToWebp(input: Buffer) {
    return sharp(input).rotate().webp({ quality: 82 }).toBuffer();
  }

  async list(storeId: string, userId: string, vehicleId: string) {
    await this.verifyUserInStore(userId, storeId);
    await this.ensureVehicleInStore(storeId, vehicleId);

    const data = await this.prisma.vehicleMedia.findMany({
      where: { vehicleId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return { data };
  }

  async uploadAndRegister(
    storeId: string,
    userId: string,
    vehicleId: string,
    file: Express.Multer.File,
    dto: { kind?: string; isCover?: boolean; position?: number },
  ) {
    await this.verifyUserInStore(userId, storeId);
    await this.ensureVehicleInStore(storeId, vehicleId);

    if (!file || !file.buffer?.length) throw new ForbiddenException('FILE_REQUIRED');

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedVideos = ['video/mp4'];

    const kind = this.normalizeKind(dto.kind, file.mimetype);

    if (kind === MediaKind.IMAGE && !allowedImages.includes(file.mimetype)) {
      throw new ForbiddenException('UNSUPPORTED_IMAGE_TYPE');
    }
    if (kind === MediaKind.VIDEO && !allowedVideos.includes(file.mimetype)) {
      throw new ForbiddenException('UNSUPPORTED_VIDEO_TYPE');
    }

    let uploadBuffer = file.buffer;
    let uploadMime = file.mimetype;
    let ext = 'bin';

    // ✅ Convertir imágenes a WebP siempre
    if (kind === MediaKind.IMAGE) {
      uploadBuffer = await this.convertToWebp(file.buffer);
      uploadMime = 'image/webp';
      ext = 'webp';
    } else {
      uploadMime = file.mimetype;
      ext = 'mp4';
    }

    const fileKey = this.buildKey(storeId, vehicleId, kind, ext);

    await this.r2.uploadObject(fileKey, uploadBuffer, uploadMime);

    const url = this.r2.buildPublicUrl(fileKey);

    const nextPos =
      dto.position ??
      ((await this.prisma.vehicleMedia.aggregate({
        where: { vehicleId },
        _max: { position: true },
      }))._max.position ?? -1) + 1;

    return this.prisma.$transaction(async (tx) => {
      if (dto.isCover) {
        await tx.vehicleMedia.updateMany({
          where: { vehicleId, isCover: true },
          data: { isCover: false },
        });
      }

      return tx.vehicleMedia.create({
        data: {
          vehicleId,
          kind,
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
    userId: string,
    vehicleId: string,
    files: Express.Multer.File[],
    dto: { isCoverFirst?: boolean; startPosition?: number },
  ) {
    await this.verifyUserInStore(userId, storeId);
    await this.ensureVehicleInStore(storeId, vehicleId);

    if (!files?.length) throw new ForbiddenException('FILES_REQUIRED');

    const allowedImages = ['image/jpeg', 'image/png', 'image/webp'];

    for (const f of files) {
      if (!f.buffer?.length) throw new ForbiddenException('FILE_REQUIRED');
      if (!allowedImages.includes(f.mimetype)) throw new ForbiddenException('UNSUPPORTED_IMAGE_TYPE');
    }

    const maxPos =
      (await this.prisma.vehicleMedia.aggregate({
        where: { vehicleId },
        _max: { position: true },
      }))._max.position ?? -1;

    const startPos = dto.startPosition ?? maxPos + 1;

    const uploadedKeys: string[] = [];
    const items: { fileKey: string; url: string; position: number; isCover: boolean }[] = [];

    try {
      // 1) Subir todo a R2 (WebP)
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const webpBuffer = await this.convertToWebp(file.buffer);
        const fileKey = this.buildKey(storeId, vehicleId, MediaKind.IMAGE, 'webp');

        await this.r2.uploadObject(fileKey, webpBuffer, 'image/webp');

        uploadedKeys.push(fileKey);

        items.push({
          fileKey,
          url: this.r2.buildPublicUrl(fileKey),
          position: startPos + i,
          isCover: !!dto.isCoverFirst && i === 0,
        });
      }

      // 2) Registrar en DB
      const created = await this.prisma.$transaction(async (tx) => {
        if (dto.isCoverFirst) {
          await tx.vehicleMedia.updateMany({
            where: { vehicleId, isCover: true },
            data: { isCover: false },
          });
        }

        // ✅ FIX: tipar results para que no sea never[]
        const results: VehicleMedia[] = [];

        for (const item of items) {
          const row = await tx.vehicleMedia.create({
            data: {
              vehicleId,
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
      // Best-effort cleanup: si falló DB, borrar lo que ya subimos
      for (const key of uploadedKeys) {
        try {
          await this.r2.deleteObject(key);
        } catch { }
      }
      throw e;
    }
  }

  async setCover(storeId: string, userId: string, vehicleId: string, mediaId: string) {
    await this.verifyUserInStore(userId, storeId);
    await this.ensureVehicleInStore(storeId, vehicleId);

    const media = await this.prisma.vehicleMedia.findFirst({
      where: { id: mediaId, vehicleId },
      select: { id: true },
    });
    if (!media) throw new NotFoundException('MEDIA_NOT_FOUND');

    return this.prisma.$transaction(async (tx) => {
      await tx.vehicleMedia.updateMany({
        where: { vehicleId, isCover: true },
        data: { isCover: false },
      });

      return tx.vehicleMedia.update({
        where: { id: mediaId },
        data: { isCover: true },
      });
    });
  }

  async reorder(storeId: string, userId: string, vehicleId: string, orderedIds: string[]) {
    await this.verifyUserInStore(userId, storeId);
    await this.ensureVehicleInStore(storeId, vehicleId);

    const count = await this.prisma.vehicleMedia.count({
      where: { vehicleId, id: { in: orderedIds } },
    });
    if (count !== orderedIds.length) throw new ForbiddenException('INVALID_MEDIA_IDS');

    await this.prisma.$transaction(
      orderedIds.map((id, idx) =>
        this.prisma.vehicleMedia.update({
          where: { id },
          data: { position: idx },
        }),
      ),
    );

    const data = await this.prisma.vehicleMedia.findMany({
      where: { vehicleId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return { ok: true, data };
  }

  async remove(storeId: string, userId: string, vehicleId: string, mediaId: string, deleteFile: boolean) {
    await this.verifyUserInStore(userId, storeId);
    await this.ensureVehicleInStore(storeId, vehicleId);

    const media = await this.prisma.vehicleMedia.findFirst({
      where: { id: mediaId, vehicleId },
      select: { id: true, fileKey: true, isCover: true },
    });
    if (!media) throw new NotFoundException('MEDIA_NOT_FOUND');

    await this.prisma.vehicleMedia.delete({ where: { id: mediaId } });

    if (deleteFile) {
      await this.r2.deleteObject(media.fileKey);
    }

    if (media.isCover) {
      const first = await this.prisma.vehicleMedia.findFirst({
        where: { vehicleId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        select: { id: true },
      });

      if (first) {
        await this.prisma.vehicleMedia.update({
          where: { id: first.id },
          data: { isCover: true },
        });
      }
    }

    return { ok: true };
  }
}
