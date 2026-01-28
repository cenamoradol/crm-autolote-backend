import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LicenseExpiredException } from '../errors/license-expired.exception';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const method = (req.method || 'GET').toUpperCase();
    const storeId = req.storeId as string | undefined;
    const user = req.user as { isSuperAdmin?: boolean } | undefined;

    // SuperAdmin bypass
    if (user?.isSuperAdmin) return true;

    // Si no hay storeId (auth/public), no aplica
    if (!storeId) return true;

    // GET permitido siempre
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

    const now = new Date();

    // 1) Si hay suscripciones ACTIVE vencidas, marcarlas como EXPIRED (auto-limpieza)
    await this.prisma.storeSubscription.updateMany({
      where: {
        storeId,
        status: SubscriptionStatus.ACTIVE,
        endsAt: { not: null, lte: now },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    // 2) Validar que exista una ACTIVE vigente
    const active = await this.prisma.storeSubscription.findFirst({
      where: {
        storeId,
        status: SubscriptionStatus.ACTIVE,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { id: true },
    });

    if (!active) throw new LicenseExpiredException();
    return true;
  }
}
