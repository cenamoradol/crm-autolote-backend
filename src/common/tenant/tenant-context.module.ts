import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantContextModule {}
