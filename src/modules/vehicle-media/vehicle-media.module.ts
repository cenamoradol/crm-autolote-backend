import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VehicleMediaController } from './vehicle-media.controller';
import { VehicleMediaService } from './vehicle-media.service';
import { R2Service } from '../../common/r2/r2.service';

@Module({
  imports: [PrismaModule],
  controllers: [VehicleMediaController],
  providers: [VehicleMediaService, R2Service],
})
export class VehicleMediaModule {}
