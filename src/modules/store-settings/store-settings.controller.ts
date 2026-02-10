import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { UpdateBrandingDto } from './dto/update-branding.dto';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('store-settings')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard, LicenseGuard)
export class StoreSettingsController {
  constructor(private readonly settings: StoreSettingsService) { }

  // -------- Branding --------
  @Get('branding')
  @Roles('admin', 'supervisor', 'seller')
  getBranding(@Req() req: any) {
    return this.settings.getBranding(req.storeId);
  }

  @Patch('branding')
  @Roles('admin', 'supervisor')
  updateBranding(@Req() req: any, @Body() dto: UpdateBrandingDto) {
    return this.settings.updateBranding(req.storeId, dto);
  }

  // -------- Domains --------
  @Get('domains')
  @Roles('admin', 'supervisor', 'seller')
  listDomains(@Req() req: any) {
    return this.settings.listDomains(req.storeId);
  }

  @Post('domains')
  @Roles('admin', 'supervisor')
  addDomain(@Req() req: any, @Body() dto: CreateDomainDto) {
    return this.settings.addDomain(req.storeId, dto);
  }

  @Patch('domains/:id')
  @Roles('admin', 'supervisor')
  updateDomain(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateDomainDto) {
    return this.settings.updateDomain(req.storeId, id, dto);
  }

  @Delete('domains/:id')
  @Roles('admin', 'supervisor')
  removeDomain(@Req() req: any, @Param('id') id: string) {
    return this.settings.removeDomain(req.storeId, id);
  }

  // -------- API Keys --------
  @Get('api-keys')
  @Roles('admin', 'supervisor')
  listApiKeys(@Req() req: any) {
    return this.settings.listApiKeys(req.storeId);
  }

  @Post('api-keys')
  @Roles('admin')
  createApiKey(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    return this.settings.createApiKey(req.storeId, dto);
  }

  @Post('api-keys/:id/rotate')
  @Roles('admin')
  rotateApiKey(@Req() req: any, @Param('id') id: string) {
    return this.settings.rotateApiKey(req.storeId, id);
  }

  @Delete('api-keys/:id')
  @Roles('admin')
  deleteApiKey(@Req() req: any, @Param('id') id: string) {
    return this.settings.deleteApiKey(req.storeId, id);
  }

  // -------- Members (for lookups) --------
  @Get('members')
  @Roles('admin', 'supervisor', 'seller')
  listMembers(@Req() req: any, @Query('q') q?: string) {
    return this.settings.listMembers(req.storeId, q);
  }
}
