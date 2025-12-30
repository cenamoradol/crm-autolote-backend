import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { JwtStrategy } from '../../common/auth/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any;

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET!,
      signOptions: { expiresIn: ACCESS_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
