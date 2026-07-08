import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { WhatsAppConfigService } from './whatsapp-config.service';

@Controller('whatsapp/config')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class WhatsAppConfigController {
  constructor(private readonly configService: WhatsAppConfigService) {}

  @Get()
  @RequirePermissions('whatsapp:read')
  async getConfig(@Req() req: any) {
    return this.configService.getConfig(req.storeId);
  }

  @Get('status')
  @RequirePermissions('whatsapp:read')
  async getStatus(@Req() req: any) {
    return this.configService.getStatus(req.storeId);
  }

  @Post('qr')
  @RequirePermissions('whatsapp:update')
  async generateQR(@Req() req: any) {
    return this.configService.generateQR(req.storeId);
  }

  @Post('qr/phone')
  @RequirePermissions('whatsapp:update')
  async generateQRWithPhone(@Req() req: any, @Body() body: { phone: string }) {
    return this.configService.generateQRWithPhone(req.storeId, body.phone);
  }

  @Post('disconnect')
  @RequirePermissions('whatsapp:update')
  async disconnect(@Req() req: any) {
    await this.configService.disconnect(req.storeId);
    return { success: true };
  }

  @Patch('settings')
  @RequirePermissions('whatsapp:update')
  async updateSettings(
    @Req() req: any,
    @Body() body: {
      timezone?: string;
      closedMessage?: string;
      welcomeMessage?: string;
      fallbackMessage?: string;
      vendorRequestMessage?: string;
      noVendorsMessage?: string;
      vehicleSelectionMessage?: string;
      searchPromptMessage?: string;
    },
  ) {
    return this.configService.updateSettings(req.storeId, body);
  }

  @Get('users')
  @RequirePermissions('whatsapp:update')
  async getStoreUsers(@Req() req: any) {
    return this.configService.getStoreUsers(req.storeId);
  }

  @Post('vendors')
  @RequirePermissions('whatsapp:update')
  async addVendor(@Req() req: any, @Body() body: { userId: string; phone: string }) {
    return this.configService.addVendor(req.storeId, body.userId, body.phone);
  }

  @Delete('vendors/:userId')
  @RequirePermissions('whatsapp:update')
  async removeVendor(@Req() req: any, @Param('userId') userId: string) {
    return this.configService.removeVendor(req.storeId, userId);
  }

  @Patch('vendors/:userId/availability')
  @RequirePermissions('whatsapp:update')
  async setVendorAvailability(@Req() req: any, @Param('userId') userId: string, @Body() body: { isAvailable: boolean }) {
    return this.configService.setVendorAvailability(req.storeId, userId, body.isAvailable);
  }

  @Post('business-hours')
  @RequirePermissions('whatsapp:update')
  async setBusinessHours(@Req() req: any, @Body() body: { dayOfWeek: number; openTime: string; closeTime: string; isActive: boolean }) {
    return this.configService.setBusinessHours(req.storeId, body.dayOfWeek, body.openTime, body.closeTime, body.isActive);
  }

  @Post('business-hours/default')
  @RequirePermissions('whatsapp:update')
  async setDefaultBusinessHours(@Req() req: any) {
    return this.configService.setDefaultBusinessHours(req.storeId);
  }
}
