import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WhatsAppSessionService } from './whatsapp-session.service';
import { WhatsAppHandlerService } from './whatsapp-handler.service';
import { WhatsAppFollowUpService } from './whatsapp-followup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { wwebjsManager } from './wwebjs-utils';

@Injectable()
export class WhatsAppGatewayService implements OnModuleInit, OnModuleDestroy {
  private followUpInterval: NodeJS.Timeout;

  constructor(
    private readonly sessionService: WhatsAppSessionService,
    private readonly handlerService: WhatsAppHandlerService,
    private readonly followUpService: WhatsAppFollowUpService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    console.log('[WhatsApp Gateway] Initializing...');
    await this.restoreSessions();
    this.startFollowUpProcessor();
  }

  async onModuleDestroy() {
    console.log('[WhatsApp Gateway] Shutting down...');
    if (this.followUpInterval) {
      clearInterval(this.followUpInterval);
    }
  }

  private startFollowUpProcessor() {
    this.followUpInterval = setInterval(async () => {
      try {
        await this.followUpService.processFollowUps();
      } catch (error) {
        console.error('[WhatsApp Gateway] Follow-up processing error:', error);
      }
    }, 60000);
    console.log('[WhatsApp Gateway] Follow-up processor started (every 60s)');
  }

  private async restoreSessions() {
    try {
      const connectedStores = await this.prisma.store.findMany({
        where: { whatsappIsConnected: true },
        select: { id: true },
      });

      console.log(`[WhatsApp Gateway] Found ${connectedStores.length} connected stores`);

      for (const store of connectedStores) {
        console.log(`[WhatsApp Gateway] Restoring session for store ${store.id}`);
        
        try {
          const callbacks: any = {
            onConnected: async (phone: string) => {
              console.log(`[WhatsApp Gateway] Session restored for ${store.id}, phone: ${phone}`);
            },
            onDisconnected: async () => {
              console.log(`[WhatsApp Gateway] Session disconnected for ${store.id}`);
            },
          };

          await wwebjsManager.restoreSession(store.id, callbacks);
          this.setupMessageHandler(store.id);
          
          console.log(`[WhatsApp Gateway] Session restore initiated for store ${store.id}`);
        } catch (error) {
          console.error(`[WhatsApp Gateway] Failed to restore session for ${store.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[WhatsApp Gateway] Error restoring sessions:', error);
    }
  }

  private setupMessageHandler(storeId: string) {
    wwebjsManager.setMessageHandler(storeId, async (from, text, timestamp, rawFrom) => {
      console.log(`[WhatsApp Gateway] Message from ${from} (raw: ${rawFrom}): ${text?.substring(0, 50)}`);
      
      try {
        const conversation = await this.prisma.whatsAppConversation.upsert({
          where: {
            storeId_customerPhone: { storeId, customerPhone: from },
          },
          create: {
            storeId,
            customerPhone: from,
            customerName: 'WhatsApp',
            lastMessage: text,
            lastMessageAt: timestamp,
            status: 'PENDING',
          },
          update: {
            lastMessage: text,
            lastMessageAt: timestamp,
          },
        });

        console.log(`[WhatsApp Gateway] Conversation ${conversation.id} saved`);

        await this.handlerService.handleMessage({
          storeId,
          from,
          text,
          timestamp,
          whatsappId: rawFrom,
        });
      } catch (error) {
        console.error('[WhatsApp Gateway] Error handling message:', error);
      }
    });
  }

  async generateQR(storeId: string) {
    const qr = await this.sessionService.generateQR(storeId);
    this.setupMessageHandler(storeId);
    return qr;
  }

  async disconnect(storeId: string) {
    await this.sessionService.markDisconnected(storeId);
  }

  async getStatus(storeId: string) {
    return this.sessionService.getSessionStatus(storeId);
  }

  async simulateIncomingMessage(storeId: string, from: string, text: string) {
    await this.handlerService.handleMessage({
      storeId,
      from,
      text,
      timestamp: new Date(),
    });
  }
}
