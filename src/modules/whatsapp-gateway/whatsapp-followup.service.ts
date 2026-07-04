import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationService } from '../vendor-assignment/conversation.service';
import { WhatsAppMessageService } from './whatsapp-message.service';
import { VendorAssignmentService } from '../vendor-assignment/vendor-assignment.service';

@Injectable()
export class WhatsAppFollowUpService {
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
    private readonly messageService: WhatsAppMessageService,
    private readonly vendorAssignment: VendorAssignmentService,
  ) {}

  async processFollowUps() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingConversations = await this.prisma.whatsAppConversation.findMany({
        where: {
          status: 'ASSIGNED',
          nextFollowUpAt: { lte: new Date() },
          followUpCount: { lt: 3 },
        },
      });

      for (const conversation of pendingConversations) {
        await this.sendFollowUp(conversation.id, conversation.storeId, conversation.customerPhone);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendFollowUp(conversationId: string, storeId: string, customerPhone: string) {
    const chatId = `${customerPhone}@lid`;

    await this.messageService.sendReplyToChat(storeId, chatId,
      `👋 ¿Te atendió el vendedor?\n\nResponde *Sí* para finalizar la conversación.\nResponde *No* para que te contactemos de nuevo.`
    );

    await this.conversationService.markFollowUpSent(conversationId);
  }

  async handleFollowUpResponse(storeId: string, customerPhone: string, response: 'si' | 'no'): Promise<boolean> {
    const conversation = await this.conversationService.findByCustomer(storeId, customerPhone);

    if (!conversation || conversation.status !== 'ASSIGNED') {
      return false;
    }

    if (response === 'si') {
      await this.conversationService.close(conversation.id, 'CUSTOMER_CONFIRMED');
      await this.vendorAssignment.setVendorAvailability(storeId, conversation.vendorId!, true);

      const chatId = `${customerPhone}@lid`;
      await this.messageService.sendReplyToChat(storeId, chatId,
        `✅ ¡Gracias por contactarnos!\n\nTu conversación ha sido finalizada. Si tienes más preguntas, no dudes en escribirnos. ¡Te deseamos un excelente día! 🚗`
      );

      return true;
    } else {
      await this.conversationService.scheduleFollowUp(conversation.id);

      const chatId = `${customerPhone}@lid`;
      await this.messageService.sendReplyToChat(storeId, chatId,
        `📋 Un vendedor te contactará en breve. Gracias por tu paciencia.`
      );

      return true;
    }
  }
}
