import { Module } from '@nestjs/common';
import { QueuesModule } from '../queues.module';
import { AuditQueueService } from './audit.queue.service';

@Module({
  imports: [QueuesModule],
  providers: [AuditQueueService],
  exports: [AuditQueueService],
})
export class AuditModule {}
