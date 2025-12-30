import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StoreContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { sub: string } | undefined;

    if (!user?.sub) throw new UnauthorizedException();

    const storeId = (req.headers['x-store-id'] as string | undefined)?.trim();
    if (!storeId) {
      throw new BadRequestException({
        code: 'STORE_REQUIRED',
        message: 'Header x-store-id es requerido.',
      });
    }

    const membership = await this.prisma.userRole.findFirst({
      where: { userId: user.sub, storeId },
      include: { role: true },
    });

    if (!membership) {
      throw new UnauthorizedException({
        code: 'STORE_FORBIDDEN',
        message: 'No tienes acceso a esta tienda.',
      });
    }

    req.storeId = storeId;
    return true;
  }
}
