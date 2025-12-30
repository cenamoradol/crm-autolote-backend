import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export type AuditJobData = {
  storeId: string;
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: any;
  after?: any;
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditQueueService {
  constructor(@InjectQueue('audit') private readonly auditQueue: Queue) {}

  async enqueue(data: AuditJobData) {
    try {
      await this.auditQueue.add('audit-log', data, {
        removeOnComplete: 5000,
        removeOnFail: 5000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    } catch {
      // Nunca romper el request si Redis falla
    }
  }
}
