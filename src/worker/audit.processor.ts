import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

type AuditJobData = {
  storeId: string;
  actorUserId?: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: any;
  after?: any;
  ip?: string;
  userAgent?: string;
};

@Processor('audit')
export class AuditProcessor extends WorkerHost {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<AuditJobData>): Promise<any> {
    const data = job.data;

    await this.prisma.auditLog.create({
      data: {
        storeId: data.storeId,
        actorUserId: data.actorUserId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        before: data.before ?? undefined,
        after: data.after ?? undefined,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });

    return { ok: true };
  }
}
