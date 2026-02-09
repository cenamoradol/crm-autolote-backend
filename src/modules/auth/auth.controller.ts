import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { TenantContextService } from '../../common/tenant/tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tenant: TenantContextService,
    private readonly prisma: PrismaService,
  ) { }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto.email, dto.password, req);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    const userId = req.user.sub;
    const isSuperAdmin = !!req.user.isSuperAdmin;
    const ctx = await this.tenant.resolveByRequest(req);

    let storeId: string | undefined;

    if (ctx.mode === 'tenant') {
      storeId = ctx.store?.id;
      // Validar acceso si no es SuperAdmin
      if (storeId && !isSuperAdmin) {
        const ok = await this.prisma.userRole.findFirst({
          where: { userId, storeId },
        });
        if (!ok) return null; // O lanzar Unauthorized
      }
    } else if (ctx.mode === 'master') {
      storeId = req.headers['x-store-id'];
    }

    return this.auth.me(userId, storeId);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: any) {
    return this.auth.forgotPassword(dto.email, req);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }
}
