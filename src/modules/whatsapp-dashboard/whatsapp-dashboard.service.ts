import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationService } from '../vendor-assignment/conversation.service';
import { VendorAssignmentService } from '../vendor-assignment/vendor-assignment.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WhatsAppDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
    private readonly vendorAssignmentService: VendorAssignmentService,
  ) {}

  async getConversations(
    storeId: string,
    filters?: {
      status?: 'PENDING' | 'ASSIGNED' | 'CLOSED';
      vendorId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const where: Prisma.WhatsAppConversationWhereInput = { storeId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    return this.prisma.whatsAppConversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async getConversation(storeId: string, conversationId: string) {
    return this.prisma.whatsAppConversation.findFirst({
      where: {
        id: conversationId,
        storeId,
      },
    });
  }

  async closeConversation(storeId: string, conversationId: string, closedBy?: string) {
    await this.vendorAssignmentService.closeConversation(conversationId, closedBy);
    return this.getConversation(storeId, conversationId);
  }

  async getMetrics(
    storeId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const from = dateFrom ? new Date(dateFrom) : undefined;
    const to = dateTo ? new Date(dateTo) : undefined;

    return this.conversationService.getMetrics(storeId, from, to);
  }

  async getVendorPerformance(storeId: string, dateFrom?: string, dateTo?: string) {
    const where: Prisma.WhatsAppConversationWhereInput = {
      storeId,
      status: 'CLOSED',
    };

    if (dateFrom || dateTo) {
      where.closedAt = {};
      if (dateFrom) where.closedAt.gte = new Date(dateFrom);
      if (dateTo) where.closedAt.lte = new Date(dateTo);
    }

    const conversations = await this.prisma.whatsAppConversation.findMany({
      where,
      select: {
        vendorId: true,
        vendorName: true,
        assignedAt: true,
        closedAt: true,
      },
    });

    const vendorStats: Record<string, any> = {};

    for (const conv of conversations) {
      if (!conv.vendorId) continue;

      if (!vendorStats[conv.vendorId]) {
        vendorStats[conv.vendorId] = {
          vendorId: conv.vendorId,
          vendorName: conv.vendorName,
          totalConversations: 0,
          totalTimeMs: 0,
        };
      }

      vendorStats[conv.vendorId].totalConversations++;

      if (conv.assignedAt && conv.closedAt) {
        const timeMs = conv.closedAt.getTime() - conv.assignedAt.getTime();
        vendorStats[conv.vendorId].totalTimeMs += timeMs;
      }
    }

    return Object.values(vendorStats).map((stats: any) => ({
      vendorId: stats.vendorId,
      vendorName: stats.vendorName,
      totalConversations: stats.totalConversations,
      avgResponseTimeMinutes: stats.totalConversations > 0
        ? Math.round(stats.totalTimeMs / stats.totalConversations / 60000)
        : 0,
    }));
  }

  async getActiveConversationsCount(storeId: string) {
    const count = await this.prisma.whatsAppConversation.count({
      where: {
        storeId,
        status: { in: ['PENDING', 'ASSIGNED'] },
      },
    });

    return { count };
  }
}
