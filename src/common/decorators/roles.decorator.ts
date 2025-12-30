import { SetMetadata } from '@nestjs/common';
import { RoleKey } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleKey[]) => SetMetadata(ROLES_KEY, roles);
