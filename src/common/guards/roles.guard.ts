import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleKey } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RoleKey[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { sub: string; isSuperAdmin?: boolean } | undefined;
    const storeId = req.storeId as string | undefined;

    // SuperAdmin bypass
    if (user?.isSuperAdmin) return true;

    if (!user?.sub || !storeId) return false;

    const roles = await this.prisma.userRole.findMany({
      where: { userId: user.sub, storeId },
      include: { role: true },
    });

    const roleKeys = roles.map((r) => r.role.key);
    const ok = required.some((r) => roleKeys.includes(r));

    if (!ok) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'No tienes permisos.' });
    }

    return true;
  }
}
