import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationService } from './conversation.service';
import { formatPhoneNumber } from '../whatsapp-gateway/wwebjs-utils';

export interface VendorInfo {
  userId: string;
  userName: string;
  phone: string;
}

@Injectable()
export class VendorAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
  ) {}

  async addVendor(storeId: string, userId: string, phone: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.vendorAvailability.upsert({
      where: {
        storeId_userId: { storeId, userId },
      },
      create: {
        storeId,
        userId,
        userName: user.fullName || user.email,
        phone: formatPhoneNumber(phone),
        isAvailable: true,
      },
      update: {
        userName: user.fullName || user.email,
        phone: formatPhoneNumber(phone),
      },
    });
  }

  async removeVendor(storeId: string, userId: string): Promise<void> {
    await this.prisma.vendorAvailability.deleteMany({
      where: { storeId, userId },
    });
  }

  async getVendors(storeId: string) {
    return this.prisma.vendorAvailability.findMany({
      where: { storeId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async setVendorAvailability(storeId: string, userId: string, isAvailable: boolean): Promise<void> {
    await this.prisma.vendorAvailability.updateMany({
      where: { storeId, userId },
      data: { isAvailable },
    });
  }

  async getAvailableVendors(storeId: string): Promise<VendorInfo[]> {
    const vendors = await this.prisma.vendorAvailability.findMany({
      where: { storeId, isAvailable: true },
    });

    return vendors.map((v) => ({
      userId: v.userId,
      userName: v.userName,
      phone: v.phone,
    }));
  }

  async assignNextAvailableVendor(storeId: string): Promise<VendorInfo | null> {
    const available = await this.getAvailableVendors(storeId);

    if (available.length === 0) {
      return null;
    }

    return available[0];
  }

  async assignVendorToConversation(
    storeId: string,
    customerPhone: string,
    vendor: VendorInfo,
  ): Promise<void> {
    const phone = formatPhoneNumber(customerPhone);

    let conversation = await this.conversationService.findByCustomer(storeId, phone);

    if (!conversation) {
      conversation = await this.conversationService.create({
        storeId,
        customerPhone: phone,
        vendorId: vendor.userId,
        vendorName: vendor.userName,
      });
    } else {
      await this.conversationService.assignVendor(conversation.id, vendor.userId, vendor.userName);
    }

    await this.setVendorAvailability(storeId, vendor.userId, false);
  }

  async closeConversationByCustomer(storeId: string, customerPhone: string): Promise<void> {
    const phone = formatPhoneNumber(customerPhone);
    const conversation = await this.conversationService.findByCustomer(storeId, phone);

    if (conversation?.vendorId) {
      await this.setVendorAvailability(storeId, conversation.vendorId, true);
    }

    await this.conversationService.closeByCustomer(storeId, phone);
  }

  async closeConversation(conversationId: string, closedBy?: string): Promise<void> {
    const conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
    });

    if (conversation?.vendorId) {
      await this.setVendorAvailability(conversation.storeId, conversation.vendorId, true);
    }

    await this.conversationService.close(conversationId, closedBy);
  }

  async getAssignmentStatus(storeId: string, customerPhone: string) {
    const phone = formatPhoneNumber(customerPhone);
    return this.conversationService.findByCustomer(storeId, phone);
  }
}
