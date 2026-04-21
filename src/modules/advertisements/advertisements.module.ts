import { Module } from '@nestjs/common';
import { AdvertisementsService } from './advertisements.service';
import { AdvertisementsController } from './advertisements.controller';
import { R2Service } from '../../common/r2/r2.service';

@Module({
  controllers: [AdvertisementsController],
  providers: [AdvertisementsService, R2Service],
})
export class AdvertisementsModule {}
