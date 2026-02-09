import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, Put } from '@nestjs/common';
import { LeadsService } from './leads.service';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { LeadQueryDto } from './dto/lead-query.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { UpsertLeadPreferenceDto } from './dto/upsert-lead-preference.dto';
import { UpdateLeadPreferenceDto } from './dto/update-lead-preference.dto';

@Controller('leads')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard, LicenseGuard)
export class LeadsController {
  constructor(private readonly leads: LeadsService) { }

  @Get()
  @Roles('admin', 'supervisor')
  list(@Req() req: any, @Query() query: LeadQueryDto) {
    return this.leads.list(req.storeId, req.user.sub, query);
  }

  @Get(':id')
  @Roles('admin', 'supervisor')
  getById(@Req() req: any, @Param('id') id: string) {
    return this.leads.getById(req.storeId, req.user.sub, id);
  }

  @Post()
  @Roles('admin', 'supervisor')
  create(@Req() req: any, @Body() dto: CreateLeadDto) {
    return this.leads.create(req.storeId, req.user.sub, dto);
  }

  @Patch(':id')
  @Roles('admin', 'supervisor')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(req.storeId, req.user.sub, id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'supervisor')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.leads.remove(req.storeId, req.user.sub, id);
  }

  @Post(':id/assign')
  @Roles('admin', 'supervisor')
  assign(@Req() req: any, @Param('id') id: string, @Body() dto: AssignLeadDto) {
    return this.leads.assign(req.storeId, req.user.sub, id, dto.assignedToUserId);
  }

  @Patch(':id/status')
  @Roles('admin', 'supervisor')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leads.updateStatus(req.storeId, req.user.sub, id, dto.status);
  }

  // -------- Preference --------

  @Get(':id/preference')
  @Roles('admin', 'supervisor')
  getPreference(@Req() req: any, @Param('id') id: string) {
    return this.leads.getPreference(req.storeId, req.user.sub, id);
  }

  @Put(':id/preference')
  @Roles('admin', 'supervisor')
  upsertPreference(@Req() req: any, @Param('id') id: string, @Body() dto: UpsertLeadPreferenceDto) {
    return this.leads.upsertPreference(req.storeId, req.user.sub, id, dto);
  }

  @Patch(':id/preference')
  @Roles('admin', 'supervisor')
  updatePreference(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateLeadPreferenceDto) {
    return this.leads.updatePreference(req.storeId, req.user.sub, id, dto);
  }

  @Delete(':id/preference')
  @Roles('admin', 'supervisor')
  deletePreference(@Req() req: any, @Param('id') id: string) {
    return this.leads.deletePreference(req.storeId, req.user.sub, id);
  }
}
