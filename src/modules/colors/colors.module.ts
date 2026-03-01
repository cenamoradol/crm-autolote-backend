import { Module } from '@nestjs/common';
import { ColorsService } from './colors.service';
import { ColorsController } from './colors.controller';

@Module({
  providers: [ColorsService],
  controllers: [ColorsController]
})
export class ColorsModule {}
