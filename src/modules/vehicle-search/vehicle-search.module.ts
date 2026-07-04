import { Module } from '@nestjs/common';
import { VehicleSearchService } from './vehicle-search.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VehicleSearchService],
  exports: [VehicleSearchService],
})
export class VehicleSearchModule {}
