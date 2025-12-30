import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { MeService } from './me.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  me(@Req() req: any) {
    return this.meService.me(req.user.sub);
  }

  @Get('stores')
  stores(@Req() req: any) {
    return this.meService.stores(req.user.sub);
  }
}
