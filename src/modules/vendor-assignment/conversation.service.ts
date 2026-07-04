import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ConversationStatus } from '@prisma/client';

export interface CreateConversationParams {
  storeId: string;
  customerPhone: string;
  customerName?: string;
  vendorId?: string;
  vendorName?: string;
}

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateConversationParams) {
    return this.prisma.whatsAppConversation.create({
      data: {
        storeId: params.storeId,
        customerPhone: params.customerPhone,
        customerName: params.customerName,
        vendorId: params.vendorId,
        vendorName: params.vendorName,
        status: params.vendorId ? 'ASSIGNED' : 'PENDING',
        assignedAt: params.vendorId ? new Date() : null,
      },
    });
  }

  async findByCustomer(storeId: string, customerPhone: string) {
    return this.prisma.whatsAppConversation.findFirst({
      where: {
        storeId,
        customerPhone,
        status: { in: ['PENDING', 'ASSIGNED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignVendor(conversationId: string, vendorId: string, vendorName: string) {
    const followUpAt = new Date();
    followUpAt.setMinutes(followUpAt.getMinutes() + 10);

    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        vendorId,
        vendorName,
        status: 'ASSIGNED',
        assignedAt: new Date(),
        nextFollowUpAt: followUpAt,
        followUpCount: 0,
      },
    });
  }

  async scheduleFollowUp(conversationId: string) {
    const followUpAt = new Date();
    followUpAt.setMinutes(followUpAt.getMinutes() + 10);

    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        nextFollowUpAt: followUpAt,
      },
    });
  }

  async markFollowUpSent(conversationId: string) {
    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        followUpSentAt: new Date(),
        followUpCount: { increment: 1 },
        nextFollowUpAt: null,
      },
    });
  }

  async getPendingFollowUps(storeId: string) {
    return this.prisma.whatsAppConversation.findMany({
      where: {
        storeId,
        status: 'ASSIGNED',
        nextFollowUpAt: { lte: new Date() },
        followUpCount: { lt: 3 },
      },
    });
  }

  async close(conversationId: string, closedBy?: string) {
    return this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy,
      },
    });
  }

  async closeByCustomer(storeId: string, customerPhone: string) {
    const conversation = await this.findByCustomer(storeId, customerPhone);
    if (conversation) {
      return this.close(conversation.id);
    }
    return null;
  }

  async getByStore(storeId: string, filters?: { status?: ConversationStatus; vendorId?: string }) {
    const where: Prisma.WhatsAppConversationWhereInput = { storeId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    return this.prisma.whatsAppConversation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMetrics(storeId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.WhatsAppConversationWhereInput = { storeId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const conversations = await this.prisma.whatsAppConversation.findMany({
      where,
    });

    const total = conversations.length;
    const pending = conversations.filter((c) => c.status === 'PENDING').length;
    const assigned = conversations.filter((c) => c.status === 'ASSIGNED').length;
    const closed = conversations.filter((c) => c.status === 'CLOSED').length;

    const closedConversations = conversations.filter(
      (c) => c.status === 'CLOSED' && c.assignedAt && c.closedAt,
    );

    const avgResponseTimeMs =
      closedConversations.length > 0
        ? closedConversations.reduce((sum, c) => {
            const diff = c.closedAt!.getTime() - c.assignedAt!.getTime();
            return sum + diff;
          }, 0) / closedConversations.length
        : 0;

    return {
      total,
      pending,
      assigned,
      closed,
      avgResponseTimeMinutes: Math.round(avgResponseTimeMs / 60000),
    };
  }
}
