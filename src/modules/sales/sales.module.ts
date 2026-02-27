import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { R2Service } from '../../common/r2/r2.service';

@Module({
  controllers: [SalesController],
  providers: [SalesService, R2Service],
})
export class SalesModule { }
