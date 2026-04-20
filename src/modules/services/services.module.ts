import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { R2Service } from '../../common/r2/r2.service';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, R2Service]
})
export class ServicesModule {}
