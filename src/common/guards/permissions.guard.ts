import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);

        // If no specific permissions are required for the route, let it pass
        if (!requiredPermissions || requiredPermissions.length === 0) return true;

        const req = ctx.switchToHttp().getRequest();
        const user = req.user as { sub: string; isSuperAdmin?: boolean } | undefined;
        const storeId = req.storeId as string | undefined;

        // Global SuperAdmin overrides everything
        if (user?.isSuperAdmin) return true;

        if (!user?.sub || !storeId) return false;

        // Fetch the user's role and its permissions json, including the permission set
        const memberships = await this.prisma.userRole.findMany({
            where: { userId: user.sub, storeId },
            include: { permissionSet: true },
        });

        // Extract all permissions from all roles the user might have in this store
        const userPermissions = new Set<string>();

        for (const ur of memberships) {
            // 1. Check direct permissions (overrides)
            if (ur.permissions) {
                const directPerms = ur.permissions as Record<string, string[]>;
                this.addPermissions(userPermissions, directPerms);
            }

            // 2. Check permissions from the set
            if ((ur as any).permissionSet?.permissions) {
                const setPerms = (ur as any).permissionSet.permissions as Record<string, string[]>;
                this.addPermissions(userPermissions, setPerms);
            }
        }

        // Check if user has AT LEAST ONE of the required permissions (OR logic for array of strings)
        // If we want AND logic, we would use `.every`
        const hasPermission = requiredPermissions.some((reqPerm) => userPermissions.has(reqPerm));

        if (!hasPermission) {
            throw new ForbiddenException({ code: 'FORBIDDEN', message: 'No tienes los permisos necesarios para esta acción.' });
        }
        return true;
    }

    private addPermissions(target: Set<string>, perms: Record<string, string[]>) {
        if (!perms) return;
        for (const [module, actions] of Object.entries(perms)) {
            if (Array.isArray(actions)) {
                for (const action of actions) {
                    target.add(`${module}:${action}`);
                }
            }
        }
    }
}
