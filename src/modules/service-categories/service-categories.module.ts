import { Module } from '@nestjs/common';
import { ServiceCategoriesService } from './service-categories.service';
import { ServiceCategoriesController } from './service-categories.controller';

@Module({
  providers: [ServiceCategoriesService],
  controllers: [ServiceCategoriesController],
  exports: [ServiceCategoriesService],
})
export class ServiceCategoriesModule {}
