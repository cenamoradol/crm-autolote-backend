import { Module } from '@nestjs/common';
import { ContextController } from './context.controller';
import { TenantContextModule } from '../../common/tenant/tenant-context.module';

@Module({
  imports: [TenantContextModule],
  controllers: [ContextController],
})
export class ContextModule {}
