import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { isSuperAdmin?: boolean } | undefined;
    if (user?.isSuperAdmin) return true;
    throw new ForbiddenException({ code: 'SUPERADMIN_ONLY', message: 'Acceso permitido únicamente para SuperAdmin.' });
  }
}
