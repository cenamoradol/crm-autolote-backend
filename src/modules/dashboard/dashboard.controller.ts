
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dashboard.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @RequirePermissions('dashboard:read')
    @Get('kpis')
    async getKpis(@Req() req: any, @Query() filter: DashboardFilterDto) {
        return this.dashboardService.getKpis(req.storeId, filter);
    }

    @RequirePermissions('dashboard:read')
    @Get('activities')
    async getRecentActivities(@Req() req: any) {
        return this.dashboardService.getRecentActivities(req.storeId);
    }

    @RequirePermissions('reports:read')
    @Get('team-kpis')
    async getTeamKpis(@Req() req: any, @Query() filter: DashboardFilterDto) {
        return this.dashboardService.getTeamKpis(req.storeId, filter);
    }
}
