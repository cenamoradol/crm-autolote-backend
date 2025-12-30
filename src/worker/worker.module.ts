import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';
import { AuditProcessor } from './audit.processor';

@Module({
  imports: [PrismaModule, QueuesModule],
  providers: [AuditProcessor],
})
export class WorkerModule {}
