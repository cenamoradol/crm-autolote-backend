import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditQueueService } from '../../queues/audit/audit.queue.service';

function sanitize(input: any, depth = 0): any {
  if (input === null || input === undefined) return input;
  if (depth > 6) return '[MAX_DEPTH]';

  if (Array.isArray(input)) {
    return input.slice(0, 50).map((x) => sanitize(x, depth + 1));
  }

  if (typeof input === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(input)) {
      if (/password|token|secret|key|hash/i.test(k)) out[k] = '[REDACTED]';
      else out[k] = sanitize(v, depth + 1);
    }
    return out;
  }

  if (typeof input === 'string') {
    return input.length > 2000 ? input.slice(0, 2000) + '...[TRUNCATED]' : input;
  }

  return input;
}

function pickEntity(baseUrl?: string, routePath?: string) {
  const raw = (baseUrl || routePath || '').replace(/^\/api\/v1\//, '').replace(/^\//, '');
  return (raw.split('/')[0] || 'unknown').toLowerCase();
}

function pickEntityId(params: any) {
  if (!params) return null;
  return params.id || params.vehicleId || params.customerId || params.leadId || params.subscriptionId || null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditQueue: AuditQueueService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<any>();
    const method = (req.method || 'GET').toUpperCase();

    // Solo writes
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) return next.handle();

    const url: string = req.originalUrl || req.url || '';

    // Excluir rutas sensibles
    if (url.includes('/auth/login') || url.includes('/auth/refresh')) return next.handle();

    const storeId: string | undefined = req.storeId;
    if (!storeId) return next.handle();

    const actorUserId: string | undefined = req.user?.sub;

    const entity = pickEntity(req.baseUrl, req.route?.path);
    const entityId = pickEntityId(req.params);

    const before = sanitize({
      params: req.params,
      query: req.query,
      body: req.body,
    });

    const ip = (req.ip || req.headers['x-forwarded-for'] || null) as any;
    const userAgent = (req.headers['user-agent'] || null) as any;

    return next.handle().pipe(
      tap({
        next: (resBody) => {
          const after = sanitize(resBody);

          this.auditQueue.enqueue({
            storeId,
            actorUserId,
            action: `${method} ${url}`,
            entity,
            entityId,
            ip,
            userAgent,
            before,
            after,
          });
        },
        error: (err) => {
          const after = sanitize({
            error: err?.message ?? 'ERROR',
            statusCode: err?.status ?? err?.statusCode,
          });

          this.auditQueue.enqueue({
            storeId,
            actorUserId,
            action: `${method} ${url}`,
            entity,
            entityId,
            ip,
            userAgent,
            before,
            after,
          });
        },
      }),
    );
  }
}
