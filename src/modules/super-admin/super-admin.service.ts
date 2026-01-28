import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { RoleKey } from '@prisma/client';

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/:\d+$/, '');
}

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  // ---------- Stores ----------
  async createStore(dto: {
    name: string;
    slug: string;
    logoUrl?: string;
    primaryDomain?: string;
    primaryBranchName?: string;
    primaryBranchAddress?: string;
    isActive?: boolean;
  }) {
    const slug = dto.slug.trim().toLowerCase();
    const name = dto.name.trim();

    const exists = await this.prisma.store.findUnique({ where: { slug } });
    if (exists) {
      throw new BadRequestException({ code: 'STORE_SLUG_TAKEN', message: 'El slug ya está en uso.' });
    }

    const store = await this.prisma.$transaction(async (tx) => {
      const created = await tx.store.create({
        data: {
          name,
          slug,
          logoUrl: dto.logoUrl?.trim() || null,
          isActive: dto.isActive ?? true,
          branches: {
            create: {
              name: dto.primaryBranchName?.trim() || 'Principal',
              address: dto.primaryBranchAddress?.trim() || null,
              isPrimary: true,
            },
          },
        },
      });

      if (dto.primaryDomain) {
        const domain = normalizeDomain(dto.primaryDomain);
        await tx.storeDomain.create({
          data: {
            storeId: created.id,
            domain,
            isPrimary: true,
          },
        });
      }

      return created;
    });

    return this.getStore(store.id);
  }

  async listStores(q?: string) {
    const query = q?.trim();
    return this.prisma.store.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        domains: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        branches: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStore(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        domains: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        branches: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { plan: true },
        },
      },
    });

    if (!store) throw new NotFoundException({ code: 'STORE_NOT_FOUND', message: 'Store no existe.' });
    return store;
  }

  async updateStore(storeId: string, dto: { name?: string; slug?: string; logoUrl?: string; isActive?: boolean }) {
    const existing = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!existing) throw new NotFoundException({ code: 'STORE_NOT_FOUND', message: 'Store no existe.' });

    const data: any = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();
      if (slug !== existing.slug) {
        const taken = await this.prisma.store.findUnique({ where: { slug } });
        if (taken) throw new BadRequestException({ code: 'STORE_SLUG_TAKEN', message: 'El slug ya está en uso.' });
        data.slug = slug;
      }
    }

    await this.prisma.store.update({ where: { id: storeId }, data });
    return this.getStore(storeId);
  }

  // ---------- Domains ----------
  async addStoreDomain(storeId: string, dto: { domain: string; isPrimary?: boolean }) {
    await this.getStore(storeId);

    const domain = normalizeDomain(dto.domain);
    if (!domain) throw new BadRequestException({ code: 'INVALID_DOMAIN', message: 'Dominio inválido.' });

    const existing = await this.prisma.storeDomain.findUnique({ where: { domain } });
    if (existing) {
      throw new BadRequestException({ code: 'DOMAIN_TAKEN', message: 'Ese dominio ya está asignado a otra store.' });
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.storeDomain.updateMany({ where: { storeId }, data: { isPrimary: false } });
      }

      await tx.storeDomain.create({
        data: { storeId, domain, isPrimary: !!dto.isPrimary },
      });

      return this.getStore(storeId);
    });
  }

  async removeStoreDomain(storeId: string, domainId: string) {
    await this.getStore(storeId);

    const domain = await this.prisma.storeDomain.findUnique({ where: { id: domainId } });
    if (!domain || domain.storeId !== storeId) {
      throw new NotFoundException({ code: 'DOMAIN_NOT_FOUND', message: 'Dominio no existe.' });
    }

    await this.prisma.storeDomain.delete({ where: { id: domainId } });
    return this.getStore(storeId);
  }

  // ---------- Users ----------
  async createUser(dto: {
    email: string;
    password: string;
    fullName?: string;
    isSuperAdmin?: boolean;
    isActive?: boolean;
  }) {
    const email = dto.email.trim().toLowerCase();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) {
      throw new BadRequestException({ code: 'EMAIL_TAKEN', message: 'Ese email ya existe.' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName?.trim() || null,
        isSuperAdmin: !!dto.isSuperAdmin,
        isActive: dto.isActive ?? true,
      },
      select: { id: true, email: true, fullName: true, isSuperAdmin: true, isActive: true, createdAt: true },
    });
  }

  async listUsers(q?: string) {
    const query = q?.trim();
    return this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { fullName: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, fullName: true, isSuperAdmin: true, isActive: true, createdAt: true },
    });
  }

  async updateUser(
    userId: string,
    dto: { fullName?: string; isSuperAdmin?: boolean; isActive?: boolean; password?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuario no existe.' });

    const data: any = {};

    if (dto.fullName !== undefined) data.fullName = dto.fullName?.trim() || null;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isSuperAdmin !== undefined) data.isSuperAdmin = dto.isSuperAdmin;

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, fullName: true, isSuperAdmin: true, isActive: true, createdAt: true },
    });
  }

  // ---------- Members (roles por store) ----------
  async listStoreMembers(storeId: string) {
    await this.getStore(storeId);

    const members = await this.prisma.userRole.findMany({
      where: { storeId },
      include: {
        user: { select: { id: true, email: true, fullName: true, isActive: true, isSuperAdmin: true } },
        role: { select: { id: true, key: true, name: true } },
      },
      orderBy: [{ userId: 'asc' }, { roleId: 'asc' }],
    });

    // agrupado por user
    const map = new Map<
      string,
      {
        user: any;
        roles: { key: RoleKey; name: string; id: string }[];
      }
    >();

    for (const m of members) {
      const key = m.user.id;
      const hit = map.get(key);
      if (!hit) {
        map.set(key, {
          user: m.user,
          roles: [{ key: m.role.key, name: m.role.name, id: m.role.id }],
        });
      } else {
        hit.roles.push({ key: m.role.key, name: m.role.name, id: m.role.id });
      }
    }

    return Array.from(map.values());
  }

  async assignMember(storeId: string, dto: { userId: string; roleKeys: RoleKey[] }) {
    await this.getStore(storeId);

    const userId = dto.userId;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuario no existe.' });

    const roleKeys = dto.roleKeys;
    if (!roleKeys || roleKeys.length === 0) {
      throw new BadRequestException({ code: 'ROLE_REQUIRED', message: 'Debes enviar al menos un rol.' });
    }

    const roles = await this.prisma.role.findMany({
      where: { key: { in: roleKeys } },
      select: { id: true, key: true, name: true },
    });

    if (roles.length !== roleKeys.length) {
      throw new BadRequestException({ code: 'INVALID_ROLE', message: 'Uno o más roles son inválidos.' });
    }

    await this.prisma.$transaction(async (tx) => {
      // Limpia roles anteriores del user en esa store
      await tx.userRole.deleteMany({ where: { storeId, userId } });

      for (const r of roles) {
        await tx.userRole.create({ data: { storeId, userId, roleId: r.id } });
      }
    });

    return this.listStoreMembers(storeId);
  }
}
