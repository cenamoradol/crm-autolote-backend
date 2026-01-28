import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class StoreContextGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { sub: string; isSuperAdmin?: boolean } | undefined;

    if (!user?.sub) throw new UnauthorizedException();

    const tenantCtx = await this.tenant.resolveByRequest(req);

    // Tenant por dominio: NO requiere x-store-id
    if (tenantCtx.mode === 'tenant') {
      const storeId = tenantCtx.store?.id;
      if (!storeId) {
        throw new UnauthorizedException({
          code: 'TENANT_NOT_FOUND',
          message: 'Dominio no registrado.',
        });
      }

      // SuperAdmin siempre puede
      if (!user.isSuperAdmin) {
        const membership = await this.prisma.userRole.findFirst({
          where: { userId: user.sub, storeId },
          select: { id: true },
        });

        if (!membership) {
          throw new UnauthorizedException({
            code: 'STORE_FORBIDDEN',
            message: 'No tienes acceso a esta tienda.',
          });
        }
      }

      req.storeId = storeId;
      req.tenant = tenantCtx;
      return true;
    }

    // Master domain: usa x-store-id (para soporte / operar tiendas específicas)
    if (tenantCtx.mode === 'master') {
      const storeId = (req.headers['x-store-id'] as string | undefined)?.trim();
      if (!storeId) {
        throw new BadRequestException({
          code: 'STORE_REQUIRED',
          message: 'Header x-store-id es requerido en modo master.',
        });
      }

      if (!user.isSuperAdmin) {
        // En master, por defecto SOLO SuperAdmin debe operar data multi-store.
        // Si en el futuro quieres permitir admins de tienda aquí, cambia esta validación.
        throw new UnauthorizedException({
          code: 'MASTER_ONLY',
          message: 'Acceso permitido únicamente para SuperAdmin en este dominio.',
        });
      }

      req.storeId = storeId;
      req.tenant = tenantCtx;
      return true;
    }

    // Unknown domain
    throw new UnauthorizedException({
      code: 'UNKNOWN_HOST',
      message: 'Dominio no reconocido.',
    });
  }
}
