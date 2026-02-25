import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) { }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });
  }

  async stores(userId: string) {
    const memberships = await (this.prisma.userRole as any).findMany({
      where: { userId },
      include: { permissionSet: true },
      orderBy: { storeId: 'asc' },
    });

    if (memberships.length === 0) return [];

    const storeIds = Array.from(new Set(memberships.map((m: any) => m.storeId))) as string[];

    const stores = await this.prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const branches = await this.prisma.branch.findMany({
      where: { storeId: { in: storeIds } },
      select: { id: true, storeId: true, name: true, isPrimary: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const domains = await this.prisma.storeDomain.findMany({
      where: { storeId: { in: storeIds } },
      select: { id: true, storeId: true, domain: true, isPrimary: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const branchesByStore = new Map<string, { id: string; name: string; isPrimary: boolean }[]>();
    for (const b of branches) {
      const arr = branchesByStore.get(b.storeId) ?? [];
      arr.push({ id: b.id, name: b.name, isPrimary: b.isPrimary });
      branchesByStore.set(b.storeId, arr);
    }

    const domainsByStore = new Map<string, { id: string; domain: string; isPrimary: boolean }[]>();
    for (const d of domains) {
      const arr = domainsByStore.get(d.storeId) ?? [];
      arr.push({ id: d.id, domain: d.domain, isPrimary: d.isPrimary });
      domainsByStore.set(d.storeId, arr);
    }

    const outMap = new Map<
      string,
      {
        storeId: string;
        slug: string;
        name: string;
        logoUrl: string | null;
        domains: { id: string; domain: string; isPrimary: boolean }[];
        branches: { id: string; name: string; isPrimary: boolean }[];
        permissions: any;
        permissionSetName?: string | null;
      }
    >();

    for (const s of stores) {
      outMap.set(s.id, {
        storeId: s.id,
        slug: s.slug,
        name: s.name,
        logoUrl: s.logoUrl,
        domains: domainsByStore.get(s.id) ?? [],
        branches: branchesByStore.get(s.id) ?? [],
        permissions: {},
      });
    }

    for (const m of memberships as any[]) {
      const entry = outMap.get(m.storeId);
      if (!entry) continue;

      const direct = m.permissions || {};
      const set = m.permissionSet?.permissions || {};

      entry.permissions = this.mergePermissions(set, direct);
      entry.permissionSetName = m.permissionSet?.name || null;
    }

    return Array.from(outMap.values());
  }

  private mergePermissions(base: any, override: any) {
    const merged = { ...base };
    for (const [mod, actions] of Object.entries(override)) {
      if (Array.isArray(actions)) {
        merged[mod] = Array.from(new Set([...(merged[mod] || []), ...actions]));
      }
    }
    return merged;
  }
}
