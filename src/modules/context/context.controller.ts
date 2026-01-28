import { Controller, Get, Req } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant/tenant-context.service';

@Controller('context')
export class ContextController {
  constructor(private readonly tenant: TenantContextService) {}

  /**
   * Devuelve el contexto del request en base al Host:
   * - master: dominio del SuperAdmin
   * - tenant: dominio de una Store
   * - unknown: sin match
   */
  @Get()
  async getContext(@Req() req: any) {
    return this.tenant.resolveByRequest(req);
  }
}
