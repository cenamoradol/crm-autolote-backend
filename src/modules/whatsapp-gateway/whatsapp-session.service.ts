import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { wwebjsManager, WhatsAppQR, ConnectionCallbacks } from './wwebjs-utils';

@Injectable()
export class WhatsAppSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async generateQR(storeId: string): Promise<WhatsAppQR> {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new Error('Store not found');

    console.log(`[WhatsApp Session] Generating QR for store ${storeId}`);

    let qrResolve: ((qr: WhatsAppQR) => void) | null = null;
    let qrReject: ((error: Error) => void) | null = null;

    const qrPromise = new Promise<WhatsAppQR>((resolve, reject) => {
      qrResolve = resolve;
      qrReject = reject;
    });

    const callbacks: ConnectionCallbacks = {
      onConnected: async (phone: string) => {
        console.log(`[WhatsApp Session] Connected with phone: ${phone}`);
        await this.prisma.store.update({
          where: { id: storeId },
          data: { whatsappIsConnected: true, whatsappConnectedAt: new Date(), whatsappBotPhone: phone },
        });
      },
      onDisconnected: async () => {
        console.log(`[WhatsApp Session] Disconnected`);
        await this.prisma.store.update({
          where: { id: storeId },
          data: { whatsappIsConnected: false, whatsappConnectedAt: null },
        });
      },
      onQRUpdated: (qr: string) => {
        console.log(`[WhatsApp Session] QR updated: ${qr}`);
        if (qrResolve) {
          qrResolve({ qr, expiresAt: Date.now() + 300000 });
          qrResolve = null;
        }
      },
      onError: (error: string) => {
        console.error(`[WhatsApp Session] Error: ${error}`);
        if (qrReject) {
          qrReject(new Error(error));
          qrReject = null;
        }
      },
    };

    const result = await wwebjsManager.createSession(storeId, callbacks);
    if (result.error) {
      throw new Error(result.error);
    }

    try {
      const qr = await Promise.race([
        qrPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('QR code timeout. Please try again.')), 300000))
      ]);
      return qr;
    } catch (error) {
      await wwebjsManager.disconnect(storeId);
      throw error;
    }
  }

  async generateQRWithPhone(storeId: string, phoneNumber: string): Promise<WhatsAppQR> {
    return this.generateQR(storeId);
  }

  async getSessionStatus(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { whatsappIsConnected: true, whatsappConnectedAt: true, whatsappBotPhone: true },
    });
    
    const isConnected = wwebjsManager.isConnected(storeId);
    const qr = wwebjsManager.getQR(storeId);

    return {
      isConnected: store?.whatsappIsConnected ?? false,
      connectedAt: store?.whatsappConnectedAt,
      phone: store?.whatsappBotPhone,
      wwebjsConnected: isConnected,
      currentQR: qr,
    };
  }

  async getAllConnectedStores(): Promise<{ storeId: string; phone: string }[]> {
    const stores = await this.prisma.store.findMany({
      where: { whatsappIsConnected: true },
      select: { id: true, whatsappBotPhone: true },
    });
    return stores.map((s) => ({ storeId: s.id, phone: s.whatsappBotPhone || '' }));
  }

  async markDisconnected(storeId: string) {
    await wwebjsManager.disconnect(storeId);
    await this.prisma.store.update({
      where: { id: storeId },
      data: { whatsappIsConnected: false, whatsappConnectedAt: null },
    });
  }

  async sendMessage(storeId: string, to: string, text: string): Promise<boolean> {
    return wwebjsManager.sendMessage(storeId, to, text);
  }
}
