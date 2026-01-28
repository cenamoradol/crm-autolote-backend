import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type TenantMode = 'master' | 'tenant' | 'unknown';

export type TenantContext = {
  mode: TenantMode;
  host: string;
  store?: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
};

function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, '');
}

function getHostFromRequest(req: any): string {
  const xfHost = (req.headers?.['x-forwarded-host'] as string | undefined) ?? '';
  const host = (xfHost.split(',')[0] || (req.headers?.host as string | undefined) || '').trim();
  return normalizeHost(host);
}

function parseMasterDomains(): string[] {
  const raw = process.env.APP_MASTER_DOMAINS || '';
  return raw
    .split(',')
    .map((s) => normalizeHost(s))
    .filter(Boolean);
}

@Injectable()
export class TenantContextService {
  private cache = new Map<string, { value: TenantContext; expiresAt: number }>();
  private readonly ttlMs = Number(process.env.TENANT_CACHE_TTL_MS || 30_000);

  constructor(private readonly prisma: PrismaService) {}

  private getCached(host: string): TenantContext | null {
    const hit = this.cache.get(host);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.cache.delete(host);
      return null;
    }
    return hit.value;
  }

  private setCached(host: string, value: TenantContext) {
    this.cache.set(host, { value, expiresAt: Date.now() + this.ttlMs });
  }

  async resolveByHost(hostRaw: string): Promise<TenantContext> {
    const host = normalizeHost(hostRaw);
    if (!host) return { mode: 'unknown', host: '' };

    const cached = this.getCached(host);
    if (cached) return cached;

    const masters = parseMasterDomains();
    if (masters.includes(host)) {
      const ctx: TenantContext = { mode: 'master', host };
      this.setCached(host, ctx);
      return ctx;
    }

    const storeDomain = await this.prisma.storeDomain.findUnique({
      where: { domain: host },
      select: {
        store: { select: { id: true, name: true, slug: true, logoUrl: true, isActive: true } },
      },
    });

    if (storeDomain?.store && storeDomain.store.isActive) {
      const ctx: TenantContext = {
        mode: 'tenant',
        host,
        store: {
          id: storeDomain.store.id,
          name: storeDomain.store.name,
          slug: storeDomain.store.slug,
          logoUrl: storeDomain.store.logoUrl,
        },
      };
      this.setCached(host, ctx);
      return ctx;
    }

    const ctx: TenantContext = { mode: 'unknown', host };
    this.setCached(host, ctx);
    return ctx;
  }

  async resolveByRequest(req: any): Promise<TenantContext> {
    const host = getHostFromRequest(req);
    return this.resolveByHost(host);
  }
}
