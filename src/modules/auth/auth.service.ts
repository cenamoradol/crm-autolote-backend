import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../../common/tenant/tenant-context.service';

export type AppJwtPayload = {
  sub: string;
  email: string;
  isSuperAdmin: boolean;
};

const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any;
const REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly tenant: TenantContextService,
  ) { }

  private signAccessToken(user: { id: string; email: string; isSuperAdmin: boolean }) {
    const payload: AppJwtPayload = { sub: user.id, email: user.email, isSuperAdmin: !!user.isSuperAdmin };
    return this.jwt.sign(payload as any, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: ACCESS_EXPIRES_IN,
    });
  }

  private signRefreshToken(user: { id: string; email: string; isSuperAdmin: boolean }) {
    const payload: AppJwtPayload = { sub: user.id, email: user.email, isSuperAdmin: !!user.isSuperAdmin };
    return this.jwt.sign(payload as any, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: REFRESH_EXPIRES_IN,
    });
  }

  private async persistRefreshToken(userId: string, refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    const decoded = this.jwt.decode(refreshToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 30 * 86400000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  /**
   * Login contextual:
   * - Si el request viene desde un dominio tenant, valida membresía de esa store (o SuperAdmin)
   * - Si el request viene desde dominio master, requiere que sea SuperAdmin
   */
  async login(email: string, password: string, req?: any) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException();

    const ctx = req ? await this.tenant.resolveByRequest(req) : { mode: 'unknown' as const, host: '' };

    // Si viene desde tenant domain, validar membresía a esa store (a menos que sea SuperAdmin)
    if (ctx.mode === 'tenant') {
      const storeId = ctx.store?.id;
      if (!storeId) throw new UnauthorizedException({ code: 'TENANT_NOT_FOUND', message: 'Dominio no registrado.' });

      if (!user.isSuperAdmin) {
        const membership = await this.prisma.userRole.findFirst({
          where: { userId: user.id, storeId },
          select: { id: true },
        });
        if (!membership) {
          throw new UnauthorizedException({
            code: 'STORE_FORBIDDEN',
            message: 'No tienes acceso a esta tienda.',
          });
        }
      }
    }

    // Si viene desde master domain, exigir SuperAdmin (por diseño SaaS)
    if (ctx.mode === 'master') {
      if (!user.isSuperAdmin) {
        throw new UnauthorizedException({
          code: 'MASTER_ONLY',
          message: 'Acceso permitido únicamente para SuperAdmin en este dominio.',
        });
      }
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);

    await this.persistRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isSuperAdmin: !!user.isSuperAdmin,
      },
      context: ctx,
    };
  }

  async refresh(refreshToken: string) {
    let payload: AppJwtPayload;
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      }) as any;
    } catch {
      throw new UnauthorizedException();
    }

    const userId = payload.sub;

    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    let matched = false;
    for (const t of tokens) {
      if (await bcrypt.compare(refreshToken, t.tokenHash)) {
        matched = true;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    return { accessToken: this.signAccessToken(user) };
  }

  async me(userId: string, storeId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, isSuperAdmin: true, createdAt: true },
    });
    if (!user) return null;

    let roles: string[] = [];
    if (storeId) {
      const ur = await this.prisma.userRole.findMany({
        where: { userId, storeId },
        include: { role: true },
      });
      roles = ur.map((r) => r.role.key);
    }

    return { ...user, roles };
  }

  async forgotPassword(email: string, req?: any) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ctx = req ? await this.tenant.resolveByRequest(req) : { mode: 'unknown' as const };

    if (!user) {
      throw new UnauthorizedException('El correo proporcionado no pertenece a ningún usuario registrado.');
    }

    if (ctx.mode === 'tenant') {
      const membership = await this.prisma.userRole.findFirst({
        where: { userId: user.id, storeId: ctx.store?.id },
      });
      if (!membership && !user.isSuperAdmin) {
        throw new UnauthorizedException('El correo proporcionado no pertenece a ningún usuario de esta tienda.');
      }
    }

    const resetToken = Array.from({ length: 64 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
    const resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    // In a real app, send email here
    console.log(`[ForgotPassword] Token for ${email}: ${resetToken}`);

    return { message: 'Se ha enviado un correo con las instrucciones.', mockToken: resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) throw new UnauthorizedException('Invalid or expired token');

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
  }
}
