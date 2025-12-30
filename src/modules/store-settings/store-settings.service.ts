import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeDomain(domain: string) {
    return domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  }

  private hashKey(plain: string) {
    return createHash('sha256').update(plain).digest('hex');
  }

  async getBranding(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, slug: true, logoUrl: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!store) throw new NotFoundException('STORE_NOT_FOUND');
    return { store };
  }

  async updateBranding(storeId: string, dto: { name?: string; slug?: string; logoUrl?: string | null }) {
    // slug es unique, si choca Prisma tirará P2002
    try {
      const store = await this.prisma.store.update({
        where: { id: storeId },
        data: {
          name: dto.name ?? undefined,
          slug: dto.slug ?? undefined,
          logoUrl: dto.logoUrl === null ? null : dto.logoUrl ?? undefined,
        },
        select: { id: true, name: true, slug: true, logoUrl: true, isActive: true, updatedAt: true },
      });
      return { store };
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ForbiddenException('UNIQUE_CONSTRAINT_VIOLATION');
      throw e;
    }
  }

  async listDomains(storeId: string) {
    const data = await this.prisma.storeDomain.findMany({
      where: { storeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return { data };
  }

  async addDomain(storeId: string, dto: { domain: string; isPrimary?: boolean }) {
    const domain = this.normalizeDomain(dto.domain);

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) {
          await tx.storeDomain.updateMany({
            where: { storeId, isPrimary: true },
            data: { isPrimary: false },
          });
        }

        const created = await tx.storeDomain.create({
          data: { storeId, domain, isPrimary: !!dto.isPrimary },
        });

        return { domain: created };
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ForbiddenException('DOMAIN_ALREADY_EXISTS');
      throw e;
    }
  }

  async updateDomain(storeId: string, id: string, dto: { domain?: string; isPrimary?: boolean }) {
    const existing = await this.prisma.storeDomain.findFirst({
      where: { id, storeId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('DOMAIN_NOT_FOUND');

    const domain = dto.domain ? this.normalizeDomain(dto.domain) : undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) {
          await tx.storeDomain.updateMany({
            where: { storeId, isPrimary: true },
            data: { isPrimary: false },
          });
        }

        const updated = await tx.storeDomain.update({
          where: { id },
          data: {
            domain: domain ?? undefined,
            isPrimary: dto.isPrimary === undefined ? undefined : !!dto.isPrimary,
          },
        });

        return { domain: updated };
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ForbiddenException('DOMAIN_ALREADY_EXISTS');
      throw e;
    }
  }

  async removeDomain(storeId: string, id: string) {
    const existing = await this.prisma.storeDomain.findFirst({
      where: { id, storeId },
      select: { id: true, isPrimary: true },
    });
    if (!existing) throw new NotFoundException('DOMAIN_NOT_FOUND');
    if (existing.isPrimary) throw new ForbiddenException('CANNOT_DELETE_PRIMARY_DOMAIN');

    await this.prisma.storeDomain.delete({ where: { id } });
    return { ok: true };
  }

  async listApiKeys(storeId: string) {
    const data = await this.prisma.storeApiKey.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, storeId: true, name: true, lastUsedAt: true, createdAt: true },
    });
    return { data };
  }

  async createApiKey(storeId: string, dto: { name: string }) {
    const plainKey = `sk_${randomBytes(24).toString('hex')}`;
    const keyHash = this.hashKey(plainKey);

    const created = await this.prisma.storeApiKey.create({
      data: {
        storeId,
        name: dto.name,
        keyHash,
      },
      select: { id: true, storeId: true, name: true, lastUsedAt: true, createdAt: true },
    });

    // ✅ Se devuelve SOLO una vez
    return { apiKey: created, plainKey };
  }

  async rotateApiKey(storeId: string, id: string) {
    const existing = await this.prisma.storeApiKey.findFirst({
      where: { id, storeId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('API_KEY_NOT_FOUND');

    const plainKey = `sk_${randomBytes(24).toString('hex')}`;
    const keyHash = this.hashKey(plainKey);

    const updated = await this.prisma.storeApiKey.update({
      where: { id },
      data: { keyHash, lastUsedAt: null },
      select: { id: true, storeId: true, name: true, lastUsedAt: true, createdAt: true },
    });

    return { apiKey: updated, plainKey };
  }

  async deleteApiKey(storeId: string, id: string) {
    const existing = await this.prisma.storeApiKey.findFirst({
      where: { id, storeId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('API_KEY_NOT_FOUND');

    await this.prisma.storeApiKey.delete({ where: { id } });
    return { ok: true };
  }
}
