import { Module } from '@nestjs/common';
import { PermissionSetsService } from './permission-sets.service';
import { PermissionSetsController } from './permission-sets.controller';

@Module({
    controllers: [PermissionSetsController],
    providers: [PermissionSetsService],
    exports: [PermissionSetsService],
})
export class PermissionSetsModule { }
