import { Module } from '@nestjs/common';
import { ConsignorsService } from './consignors.service';
import { ConsignorsController } from './consignors.controller';

@Module({
    controllers: [ConsignorsController],
    providers: [ConsignorsService],
    exports: [ConsignorsService],
})
export class ConsignorsModule { }
