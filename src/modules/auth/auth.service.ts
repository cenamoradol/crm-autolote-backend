import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

type AppJwtPayload = { sub: string; email: string };

const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any;
const REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as any;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signAccessToken(user: { id: string; email: string }) {
    const payload: AppJwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload as any, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: ACCESS_EXPIRES_IN,
    });
  }

  private signRefreshToken(user: { id: string; email: string }) {
    const payload: AppJwtPayload = { sub: user.id, email: user.email };
    return this.jwt.sign(payload as any, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: REFRESH_EXPIRES_IN,
    });
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException();

    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);

    const tokenHash = await bcrypt.hash(refreshToken, 10);

    const decoded = this.jwt.decode(refreshToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 30 * 86400000);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
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

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });
  }
}
