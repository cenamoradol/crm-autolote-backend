import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StoreSettingsController } from './store-settings.controller';
import { StoreSettingsService } from './store-settings.service';

@Module({
  imports: [PrismaModule],
  controllers: [StoreSettingsController],
  providers: [StoreSettingsService],
})
export class StoreSettingsModule {}
