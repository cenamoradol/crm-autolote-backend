import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { UpdateBrandingDto } from './dto/update-branding.dto';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('store-settings')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class StoreSettingsController {
  constructor(private readonly settings: StoreSettingsService) { }

  // -------- Branding --------
  @Get('branding')
  @RequirePermissions('store_settings:read')
  getBranding(@Req() req: any) {
    return this.settings.getBranding(req.storeId);
  }

  @Patch('branding')
  @RequirePermissions('store_settings:update')
  updateBranding(@Req() req: any, @Body() dto: UpdateBrandingDto) {
    return this.settings.updateBranding(req.storeId, dto);
  }

  // -------- Domains --------
  @Get('domains')
  @RequirePermissions('store_settings:read')
  listDomains(@Req() req: any) {
    return this.settings.listDomains(req.storeId);
  }

  @Post('domains')
  @RequirePermissions('store_settings:update')
  addDomain(@Req() req: any, @Body() dto: CreateDomainDto) {
    return this.settings.addDomain(req.storeId, dto);
  }

  @Patch('domains/:id')
  @RequirePermissions('store_settings:update')
  updateDomain(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateDomainDto) {
    return this.settings.updateDomain(req.storeId, id, dto);
  }

  @Delete('domains/:id')
  @RequirePermissions('store_settings:update')
  removeDomain(@Req() req: any, @Param('id') id: string) {
    return this.settings.removeDomain(req.storeId, id);
  }

  // -------- API Keys --------
  @Get('api-keys')
  @RequirePermissions('store_settings:update')
  listApiKeys(@Req() req: any) {
    return this.settings.listApiKeys(req.storeId);
  }

  @Post('api-keys')
  @RequirePermissions('store_settings:update')
  createApiKey(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    return this.settings.createApiKey(req.storeId, dto);
  }

  @Post('api-keys/:id/rotate')
  @RequirePermissions('store_settings:update')
  rotateApiKey(@Req() req: any, @Param('id') id: string) {
    return this.settings.rotateApiKey(req.storeId, id);
  }

  @Delete('api-keys/:id')
  @RequirePermissions('store_settings:update')
  deleteApiKey(@Req() req: any, @Param('id') id: string) {
    return this.settings.deleteApiKey(req.storeId, id);
  }

  // -------- Members (for lookups) --------
  @Get('members')
  @RequirePermissions('store_settings:read', 'sales:read', 'sales:create', 'sales:update', 'activities:create', 'activities:update')
  listMembers(@Req() req: any, @Query('q') q?: string) {
    return this.settings.listMembers(req.storeId, q);
  }
}
