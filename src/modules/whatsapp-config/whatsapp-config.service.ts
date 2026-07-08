import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppGatewayService } from '../whatsapp-gateway/whatsapp-gateway.service';
import { VendorAssignmentService } from '../vendor-assignment/vendor-assignment.service';
import { BusinessHoursService } from '../vendor-assignment/business-hours.service';

@Injectable()
export class WhatsAppConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gatewayService: WhatsAppGatewayService,
    private readonly vendorService: VendorAssignmentService,
    private readonly businessHoursService: BusinessHoursService,
  ) {}

  async getConfig(storeId: string) {
    const [store, vendors, businessHours, status] = await Promise.all([
      this.prisma.store.findUnique({
        where: { id: storeId },
        select: {
          whatsappBotPhone: true,
          whatsappIsConnected: true,
          whatsappConnectedAt: true,
          whatsappTimezone: true,
          whatsappClosedMessage: true,
          whatsappWelcomeMessage: true,
          whatsappFallbackMessage: true,
          whatsappVendorRequestMessage: true,
          whatsappNoVendorsMessage: true,
          whatsappVehicleSelectionMessage: true,
          whatsappSearchPromptMessage: true,
        },
      }),
      this.vendorService.getVendors(storeId),
      this.businessHoursService.getSchedule(storeId),
      this.gatewayService.getStatus(storeId),
    ]);

    return {
      phone: store?.whatsappBotPhone,
      isConnected: store?.whatsappIsConnected ?? false,
      connectedAt: store?.whatsappConnectedAt,
      timezone: store?.whatsappTimezone ?? 'America/Mexico_City',
      closedMessage: store?.whatsappClosedMessage,
      welcomeMessage: store?.whatsappWelcomeMessage,
      fallbackMessage: store?.whatsappFallbackMessage,
      vendorRequestMessage: store?.whatsappVendorRequestMessage,
      noVendorsMessage: store?.whatsappNoVendorsMessage,
      vehicleSelectionMessage: store?.whatsappVehicleSelectionMessage,
      searchPromptMessage: store?.whatsappSearchPromptMessage,
      status,
      vendors,
      businessHours,
    };
  }

  async generateQR(storeId: string) {
    const result = await this.gatewayService.generateQR(storeId);
    return { qr: result.qr };
  }

  async generateQRWithPhone(storeId: string, phone: string) {
    const result = await this.gatewayService.generateQRWithPhone(storeId, phone);
    return { qr: result.qr };
  }

  async updateSettings(
    storeId: string,
    data: {
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
    const updateData: any = {};
    if (data.timezone !== undefined) updateData.whatsappTimezone = data.timezone;
    if (data.closedMessage !== undefined) updateData.whatsappClosedMessage = data.closedMessage;
    if (data.welcomeMessage !== undefined) updateData.whatsappWelcomeMessage = data.welcomeMessage;
    if (data.fallbackMessage !== undefined) updateData.whatsappFallbackMessage = data.fallbackMessage;
    if (data.vendorRequestMessage !== undefined) updateData.whatsappVendorRequestMessage = data.vendorRequestMessage;
    if (data.noVendorsMessage !== undefined) updateData.whatsappNoVendorsMessage = data.noVendorsMessage;
    if (data.vehicleSelectionMessage !== undefined) updateData.whatsappVehicleSelectionMessage = data.vehicleSelectionMessage;
    if (data.searchPromptMessage !== undefined) updateData.whatsappSearchPromptMessage = data.searchPromptMessage;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.store.update({
        where: { id: storeId },
        data: updateData,
      });
    }

    return this.getConfig(storeId);
  }

  async addVendor(storeId: string, userId: string, phone: string) {
    await this.vendorService.addVendor(storeId, userId, phone);
    return this.vendorService.getVendors(storeId);
  }

  async removeVendor(storeId: string, userId: string) {
    await this.vendorService.removeVendor(storeId, userId);
    return this.vendorService.getVendors(storeId);
  }

  async setVendorAvailability(storeId: string, userId: string, isAvailable: boolean) {
    await this.vendorService.setVendorAvailability(storeId, userId, isAvailable);
    return this.vendorService.getVendors(storeId);
  }

  async setBusinessHours(
    storeId: string,
    dayOfWeek: number,
    openTime: string,
    closeTime: string,
    isActive: boolean,
  ) {
    await this.businessHoursService.setHours(storeId, dayOfWeek, openTime, closeTime, isActive);
    return this.businessHoursService.getSchedule(storeId);
  }

  async setDefaultBusinessHours(storeId: string) {
    await this.businessHoursService.setDefaultSchedule(storeId);
    return this.businessHoursService.getSchedule(storeId);
  }

  async disconnect(storeId: string) {
    await this.gatewayService.disconnect(storeId);
  }

  async getStatus(storeId: string) {
    return this.gatewayService.getStatus(storeId);
  }

  async getStoreUsers(storeId: string) {
    return this.prisma.user.findMany({
      where: {
        memberships: {
          some: { storeId },
        },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
      },
    });
  }
}
