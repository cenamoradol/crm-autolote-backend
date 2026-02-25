import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Controller('activities')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) { }

  @Get()
  @RequirePermissions('activities:read')
  list(@Req() req: any, @Query() query: ActivityQueryDto) {
    return this.activities.list(req.storeId, req.user.sub, query);
  }

  @Get(':id')
  @RequirePermissions('activities:read')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.activities.getById(req.storeId, req.user.sub, id);
  }

  @Post()
  @RequirePermissions('activities:create')
  create(@Req() req: any, @Body() dto: CreateActivityDto) {
    return this.activities.create(req.storeId, req.user.sub, dto);
  }

  @Patch(':id')
  @RequirePermissions('activities:update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activities.update(req.storeId, req.user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('activities:delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.activities.remove(req.storeId, req.user.sub, id);
  }
}
