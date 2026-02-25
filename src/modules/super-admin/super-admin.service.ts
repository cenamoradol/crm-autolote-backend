import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';


function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/:\d+$/, '');
}

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) { }

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
        memberships: {
          include: {
            user: { select: { id: true, email: true, fullName: true, isActive: true } },
            permissionSet: { select: { name: true } }
          },
        },
      },
    });

    if (!store) throw new NotFoundException({ code: 'STORE_NOT_FOUND', message: 'Store no existe.' });

    // Agrupamos miembros por usuario
    const members = store.memberships.map(m => ({
      userId: m.userId,
      email: m.user.email,
      fullName: m.user.fullName,
      isActive: m.user.isActive,
      permissions: m.permissions as any,
      permissionSetName: m.permissionSet?.name || null
    }));

    const { memberships, ...rest } = store;

    return {
      ...rest,
      members,
    };
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

    if (exists && exists.isActive) {
      throw new BadRequestException({ code: 'EMAIL_TAKEN', message: 'Ese email ya existe.' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    if (exists && !exists.isActive) {
      // Reactivate user (was soft deleted)
      return this.prisma.user.update({
        where: { id: exists.id },
        data: {
          isActive: true,
          passwordHash, // Set new password
          fullName: dto.fullName?.trim() || exists.fullName,
          isSuperAdmin: !!dto.isSuperAdmin,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
        select: { id: true, email: true, fullName: true, isSuperAdmin: true, isActive: true, createdAt: true },
      });
    }

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

  async listUsers(q?: string, storeId?: string) {
    const query = q?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          query
            ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { fullName: { contains: query, mode: 'insensitive' } },
              ],
            }
            : {},
          storeId
            ? {
              memberships: {
                some: {
                  storeId
                }
              }
            }
            : {}
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        isSuperAdmin: true,
        isActive: true,
        createdAt: true,
        memberships: {
          select: {
            store: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          },
          take: 1 // Optimization: we assume 1 store per user in this context
        }
      },
    });

    // Map to flatten structure for frontend
    return users.map(u => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isSuperAdmin: u.isSuperAdmin,
      isActive: u.isActive,
      createdAt: u.createdAt,
      store: (u as any).memberships[0]?.store || null
    }));
  }

  async getUser(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        isSuperAdmin: true,
        isActive: true,
        createdAt: true,
        memberships: {
          select: {
            store: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          },
          take: 1
        }
      },
    });

    if (!u) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuario no existe.' });

    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isSuperAdmin: u.isSuperAdmin,
      isActive: u.isActive,
      createdAt: u.createdAt,
      store: (u as any).memberships[0]?.store || null
    };
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

  // ---------- Members (permisos por store) ----------
  async listStoreMembers(storeId: string) {
    await this.getStore(storeId);

    const members = await this.prisma.userRole.findMany({
      where: { storeId },
      include: {
        user: { select: { id: true, email: true, fullName: true, isActive: true, isSuperAdmin: true } },
      },
      orderBy: { user: { email: 'asc' } },
    });

    return members.map(m => ({
      user: m.user,
      permissions: m.permissions as any,
    }));
  }

  async assignMember(storeId: string, dto: { userId: string; permissions?: any; permissionSetId?: string }) {
    await this.getStore(storeId);

    const userId = dto.userId;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuario no existe.' });

    const permissions = dto.permissions || null;
    const permissionSetId = dto.permissionSetId || null;

    if (!permissions && !permissionSetId) {
      throw new BadRequestException({ code: 'INVALID_ASSIGNMENT', message: 'Debe proporcionar permisos directos o un conjunto de permisos.' });
    }

    await this.prisma.$transaction(async (tx) => {
      // ENFORCE 1 STORE PER USER (as per implementation design):
      await tx.userRole.deleteMany({ where: { userId } });

      await tx.userRole.create({
        data: {
          storeId,
          userId,
          permissions,
          permissionSetId
        }
      });
    });

    return this.listStoreMembers(storeId);
  }

  async removeMember(storeId: string, userId: string) {
    await this.getStore(storeId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuario no existe.' });

    // Verify membership
    const membership = await this.prisma.userRole.findFirst({
      where: { storeId, userId },
    });

    if (!membership) {
      throw new NotFoundException({ code: 'MEMBERSHIP_NOT_FOUND', message: 'El usuario no pertenece a esta store.' });
    }

    await this.prisma.userRole.deleteMany({
      where: { storeId, userId },
    });

    return this.listStoreMembers(storeId);
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Usuario no existe.' });

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          passwordHash: 'DELETED',
          isSuperAdmin: false
        }
      })
    ]);

    return { success: true };
  }

  // ---------- Branches ----------
  async listStoreBranches(storeId: string) {
    return this.prisma.branch.findMany({
      where: { storeId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createBranch(storeId: string, dto: { name: string; address?: string; isPrimary?: boolean }) {
    await this.getStore(storeId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.branch.updateMany({ where: { storeId }, data: { isPrimary: false } });
      }

      await tx.branch.create({
        data: {
          storeId,
          name: dto.name.trim(),
          address: dto.address?.trim() || null,
          isPrimary: !!dto.isPrimary,
        },
      });

      return this.getStore(storeId);
    });
  }

  async updateBranch(storeId: string, branchId: string, dto: { name?: string; address?: string; isPrimary?: boolean }) {
    await this.getStore(storeId);

    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.storeId !== storeId) {
      throw new NotFoundException({ code: 'BRANCH_NOT_FOUND', message: 'Sucursal no existe.' });
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.address !== undefined) data.address = dto.address?.trim() || null;
    if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.branch.updateMany({ where: { storeId }, data: { isPrimary: false } });
      }

      await tx.branch.update({ where: { id: branchId }, data });

      return this.getStore(storeId);
    });
  }

  async removeBranch(storeId: string, branchId: string) {
    await this.getStore(storeId);
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch || branch.storeId !== storeId) {
      throw new NotFoundException({ code: 'BRANCH_NOT_FOUND', message: 'Sucursal no existe.' });
    }

    await this.prisma.branch.delete({ where: { id: branchId } });
    return this.getStore(storeId);
  }
}
