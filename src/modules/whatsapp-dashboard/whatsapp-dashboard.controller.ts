import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { WhatsAppDashboardService } from './whatsapp-dashboard.service';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class WhatsAppDashboardController {
  constructor(private readonly dashboardService: WhatsAppDashboardService) {}

  @Get('conversations')
  @RequirePermissions('whatsapp:read')
  async getConversations(
    @Req() req: any,
    @Query('status') status?: 'PENDING' | 'ASSIGNED' | 'CLOSED',
    @Query('vendorId') vendorId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.dashboardService.getConversations(req.storeId, { status, vendorId, dateFrom, dateTo });
  }

  @Get('conversations/:id')
  @RequirePermissions('whatsapp:read')
  async getConversation(@Req() req: any, @Param('id') id: string) {
    return this.dashboardService.getConversation(req.storeId, id);
  }

  @Patch('conversations/:id/close')
  @RequirePermissions('whatsapp:update')
  async closeConversation(@Req() req: any, @Param('id') id: string, @Body() body?: { closedBy?: string }) {
    return this.dashboardService.closeConversation(req.storeId, id, body?.closedBy);
  }

  @Get('metrics')
  @RequirePermissions('whatsapp:read')
  async getMetrics(@Req() req: any, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.dashboardService.getMetrics(req.storeId, dateFrom, dateTo);
  }

  @Get('metrics/vendor-performance')
  @RequirePermissions('whatsapp:read')
  async getVendorPerformance(@Req() req: any, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.dashboardService.getVendorPerformance(req.storeId, dateFrom, dateTo);
  }

  @Get('metrics/active-count')
  @RequirePermissions('whatsapp:read')
  async getActiveConversationsCount(@Req() req: any) {
    return this.dashboardService.getActiveConversationsCount(req.storeId);
  }
}
