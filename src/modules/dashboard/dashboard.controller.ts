
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dashboard.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Roles('admin')
    @Get('kpis')
    async getKpis(@Req() req: any, @Query() filter: DashboardFilterDto) {
        return this.dashboardService.getKpis(req.storeId, filter);
    }

    @Roles('admin')
    @Get('activities')
    async getRecentActivities(@Req() req: any) {
        return this.dashboardService.getRecentActivities(req.storeId);
    }
}
