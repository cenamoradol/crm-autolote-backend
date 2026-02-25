import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, Put } from '@nestjs/common';
import { LeadsService } from './leads.service';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { LeadQueryDto } from './dto/lead-query.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpsertLeadPreferenceDto } from './dto/upsert-lead-preference.dto';
import { UpdateLeadPreferenceDto } from './dto/update-lead-preference.dto';

@Controller('leads')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) { }

  @Get()
  @RequirePermissions('leads:read')
  list(@Req() req: any, @Query() query: LeadQueryDto) {
    return this.leads.list(req.storeId, req.user.sub, query);
  }

  @Get(':id')
  @RequirePermissions('leads:read')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.leads.getById(req.storeId, req.user.sub, id);
  }

  @Post()
  @RequirePermissions('leads:create')
  create(@Req() req: any, @Body() dto: CreateLeadDto) {
    return this.leads.create(req.storeId, req.user.sub, dto);
  }

  @Patch(':id')
  @RequirePermissions('leads:update')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(req.storeId, req.user.sub, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('leads:delete')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.leads.remove(req.storeId, req.user.sub, id);
  }

  @Post(':id/assign')
  @RequirePermissions('leads:update')
  assign(@Req() req: any, @Param('id') id: string, @Body() dto: AssignLeadDto) {
    return this.leads.assign(req.storeId, req.user.sub, id, dto.assignedToUserId);
  }

  @Patch(':id/status')
  @RequirePermissions('leads:update')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leads.updateStatus(req.storeId, req.user.sub, id, dto.status);
  }

  // -------- Preference --------

  @Get(':id/preference')
  @RequirePermissions('leads:read')
  getPreference(@Req() req: any, @Param('id') id: string) {
    return this.leads.getPreference(req.storeId, req.user.sub, id);
  }

  @Put(':id/preference')
  @RequirePermissions('leads:update')
  upsertPreference(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertLeadPreferenceDto) {
    return this.leads.upsertPreference(req.storeId, req.user.sub, id, dto);
  }

  @Patch(':id/preference')
  @RequirePermissions('leads:update')
  updatePreference(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLeadPreferenceDto) {
    return this.leads.updatePreference(req.storeId, req.user.sub, id, dto);
  }

  @Delete(':id/preference')
  @RequirePermissions('leads:delete')
  deletePreference(@Req() req: any, @Param('id') id: string) {
    return this.leads.deletePreference(req.storeId, req.user.sub, id);
  }
}
