import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { VehicleSearchModule } from '../vehicle-search/vehicle-search.module';

@Module({
  imports: [VehicleSearchModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
