import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });
  }

  async stores(userId: string) {
    // 1) memberships (tabla pivote)
    const memberships = await this.prisma.userRole.findMany({
      where: { userId },
      orderBy: [{ storeId: 'asc' }, { roleId: 'asc' }],
    });

    if (memberships.length === 0) return [];

    const storeIds = Array.from(new Set(memberships.map((m) => m.storeId)));
    const roleIds = Array.from(new Set(memberships.map((m) => m.roleId)));

    // 2) traer stores
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

    // 3) traer roles
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true, key: true },
    });
    const roleMap = new Map(roles.map((r) => [r.id, r.key]));

    // 4) branches por store
    const branches = await this.prisma.branch.findMany({
      where: { storeId: { in: storeIds } },
      select: { id: true, storeId: true, name: true, isPrimary: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    // 5) domains por store
    const domains = await this.prisma.storeDomain.findMany({
      where: { storeId: { in: storeIds } },
      select: { id: true, storeId: true, domain: true, isPrimary: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    // Agrupar branches/domains
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

    // 6) armar respuesta agrupada por store
    const outMap = new Map<
      string,
      {
        storeId: string;
        slug: string;
        name: string;
        logoUrl: string | null;
        domains: { id: string; domain: string; isPrimary: boolean }[];
        branches: { id: string; name: string; isPrimary: boolean }[];
        roles: string[];
      }
    >();

    // precargar stores
    for (const s of stores) {
      outMap.set(s.id, {
        storeId: s.id,
        slug: s.slug,
        name: s.name,
        logoUrl: s.logoUrl,
        domains: domainsByStore.get(s.id) ?? [],
        branches: branchesByStore.get(s.id) ?? [],
        roles: [],
      });
    }

    // agregar roles desde memberships
    for (const m of memberships) {
      const entry = outMap.get(m.storeId);
      if (!entry) continue;

      const roleKey = roleMap.get(m.roleId);
      if (roleKey && !entry.roles.includes(roleKey)) {
        entry.roles.push(roleKey);
      }
    }

    return Array.from(outMap.values());
  }
}
