import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppMessageService } from './whatsapp-message.service';
import { WhatsAppFollowUpService } from './whatsapp-followup.service';
import { VendorAssignmentService } from '../vendor-assignment/vendor-assignment.service';
import { VehicleSearchService } from '../vehicle-search/vehicle-search.service';
import { parseMessage, formatPhoneNumber } from './wwebjs-utils';
import { BusinessHoursService } from '../vendor-assignment/business-hours.service';

export interface IncomingMessage {
  storeId: string;
  from: string;
  text: string;
  timestamp: Date;
  whatsappId?: string;
}

interface CachedSearch {
  vehicles: any[];
  timestamp: Date;
}

@Injectable()
export class WhatsAppHandlerService {
  private lastSearchCache: Map<string, CachedSearch> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: WhatsAppMessageService,
    private readonly followUpService: WhatsAppFollowUpService,
    private readonly vendorAssignment: VendorAssignmentService,
    private readonly vehicleSearch: VehicleSearchService,
    private readonly businessHours: BusinessHoursService,
  ) {}

  async handleMessage(payload: IncomingMessage): Promise<void> {
    const { storeId, from, text, whatsappId } = payload;
    const normalizedPhone = formatPhoneNumber(from);
    const normalizedText = text.trim().toLowerCase();
    const sendTo = whatsappId || normalizedPhone;

    console.log(`[WhatsApp Handler] Message from ${normalizedPhone} (sendTo: ${sendTo}) in store ${storeId}: ${text}`);

    if (normalizedText === 'si' || normalizedText === 'sí') {
      const handled = await this.followUpService.handleFollowUpResponse(storeId, normalizedPhone, 'si');
      if (handled) return;
    }

    if (normalizedText === 'no') {
      const handled = await this.followUpService.handleFollowUpResponse(storeId, normalizedPhone, 'no');
      if (handled) return;
    }

    if (normalizedText === 'hola' || normalizedText === 'hi' || normalizedText === 'buenos días' || normalizedText === 'buenas') {
      if (whatsappId) {
        await this.messageService.sendWelcomeMessageToChat(storeId, whatsappId);
      } else {
        await this.messageService.sendWelcomeMessage(storeId, sendTo);
      }
      return;
    }

    if (normalizedText.includes('vendedor') || normalizedText.includes('hablar')) {
      if (whatsappId) {
        await this.handleVendorRequestToChat(storeId, whatsappId, normalizedPhone);
      } else {
        await this.handleVendorRequest(storeId, sendTo);
      }
      return;
    }

    if (normalizedText.includes('cerrar') || normalizedText.includes('cerrar conversación')) {
      await this.handleCloseConversation(storeId, normalizedPhone);
      return;
    }

    if (normalizedText === 'horario' || normalizedText === 'horarios') {
      if (whatsappId) {
        await this.handleHorarioRequestToChat(storeId, whatsappId);
      } else {
        await this.handleHorarioRequest(storeId, sendTo);
      }
      return;
    }

    const selectionNumber = parseInt(normalizedText, 10);
    if (!isNaN(selectionNumber) && selectionNumber >= 1 && selectionNumber <= 5 && whatsappId) {
      await this.handleVehicleSelection(storeId, whatsappId, selectionNumber);
      return;
    }

    const searchParams = parseMessage(text);
    if (searchParams.brand || searchParams.model || searchParams.year) {
      if (whatsappId) {
        await this.handleVehicleSearchToChat(storeId, whatsappId, searchParams);
      } else {
        await this.handleVehicleSearch(storeId, sendTo, searchParams);
      }
      return;
    }

    if (whatsappId) {
      await this.messageService.sendReplyToChat(storeId, whatsappId, '❓ No entendí tu mensaje.\n\nEscribe "Hola" para ver las opciones o busca un vehículo así:\n🚗 Honda/Civic/2014');
    } else {
      await this.messageService.sendMessage(storeId, {
        to: sendTo,
        text: 'No entendí tu mensaje. Escribe "Hola" para ver las opciones o busca un vehículo así: Honda/Civic/2014',
      });
    }
  }

  private async handleVehicleSearch(
    storeId: string,
    customerPhone: string,
    params: { brand?: string; model?: string; year?: string },
  ): Promise<void> {
    const vehicles = await this.vehicleSearch.search(storeId, {
      brand: params.brand,
      model: params.model,
      year: params.year ? parseInt(params.year, 10) : undefined,
    });

    await this.messageService.sendVehicleResults(storeId, customerPhone, vehicles);
  }

  private async handleVehicleSearchToChat(
    storeId: string,
    chatId: string,
    params: { brand?: string; model?: string; year?: string },
  ): Promise<void> {
    const vehicles = await this.vehicleSearch.search(storeId, {
      brand: params.brand,
      model: params.model,
      year: params.year ? parseInt(params.year, 10) : undefined,
    });

    this.lastSearchCache.set(chatId, { vehicles, timestamp: new Date() });

    await this.messageService.sendVehicleResultsToChat(storeId, chatId, vehicles);
  }

  private async handleVehicleSelection(
    storeId: string,
    chatId: string,
    selectionNumber: number,
  ): Promise<void> {
    const cached = this.lastSearchCache.get(chatId);

    if (!cached || Date.now() - cached.timestamp.getTime() > 30 * 60 * 1000) {
      await this.messageService.sendReplyToChat(storeId, chatId,
        '⏰ Tu selección expiró. Realiza una nueva búsqueda de vehículos.'
      );
      return;
    }

    const vehicleIndex = selectionNumber - 1;
    if (vehicleIndex < 0 || vehicleIndex >= cached.vehicles.length) {
      await this.messageService.sendReplyToChat(storeId, chatId,
        '❌ Selección inválida. Elige un número de la lista.'
      );
      return;
    }

    const selectedVehicle = cached.vehicles[vehicleIndex];
    const vehicleInfo = `${selectedVehicle.year || ''} ${selectedVehicle.brand?.name || ''} ${selectedVehicle.model?.name || ''}`.trim();
    const price = selectedVehicle.offerPrice || selectedVehicle.price;
    const priceText = price ? `$${Number(price).toLocaleString()}` : 'Precio por consultar';

    await this.messageService.sendReplyToChat(storeId, chatId,
      `✅ *Selección confirmada*\n\n🚗 Vehículo: ${vehicleInfo}\n💰 Precio: ${priceText}\n\nUn vendedor te contactará pronto para darte más información.`
    );

    const vendor = await this.vendorAssignment.assignNextAvailableVendor(storeId);
    if (vendor) {
      await this.messageService.sendVendorAssignmentToChat(storeId, chatId, vendor.userName, vendor.phone);
    }
  }

  private async handleVendorRequest(storeId: string, customerPhone: string): Promise<void> {
    const isOpen = await this.businessHours.isWithinBusinessHours(storeId);

    if (!isOpen) {
      await this.messageService.sendClosedHoursMessage(storeId, customerPhone);
      return;
    }

    const vendor = await this.vendorAssignment.assignNextAvailableVendor(storeId);

    if (!vendor) {
      await this.messageService.sendMessage(storeId, {
        to: customerPhone,
        text: 'En este momento no hay vendedores disponibles. Te contactaremos pronto.',
      });
      return;
    }

    await this.messageService.sendVendorAssignment(storeId, customerPhone, vendor.userName, vendor.phone);
  }

  private async handleVendorRequestToChat(storeId: string, chatId: string, customerPhone: string): Promise<void> {
    const isOpen = await this.businessHours.isWithinBusinessHours(storeId);

    if (!isOpen) {
      await this.messageService.sendClosedHoursMessageToChat(storeId, chatId);
      return;
    }

    const vendor = await this.vendorAssignment.assignNextAvailableVendor(storeId);

    if (!vendor) {
      await this.messageService.sendReplyToChat(storeId, chatId, '⏳ En este momento no hay vendedores disponibles.\n\nTe contactaremos pronto.');
      return;
    }

    await this.vendorAssignment.assignVendorToConversation(storeId, customerPhone, vendor);

    await this.messageService.sendVendorAssignmentToChat(storeId, chatId, vendor.userName, vendor.phone);
  }

  private async handleCloseConversation(storeId: string, customerPhone: string): Promise<void> {
    await this.vendorAssignment.closeConversationByCustomer(storeId, customerPhone);
  }

  private async handleHorarioRequest(storeId: string, customerPhone: string): Promise<void> {
    const hours = await this.businessHours.getFormattedSchedule(storeId);

    await this.messageService.sendMessage(storeId, {
      to: customerPhone,
      text: `Nuestro horario de atención:\n\n${hours}\n\nFuera de estos horarios, puedes dejar tu mensaje y un vendedor te responderá lo antes posible.`,
    });
  }

  private async handleHorarioRequestToChat(storeId: string, chatId: string): Promise<void> {
    const hours = await this.businessHours.getFormattedSchedule(storeId);

    await this.messageService.sendReplyToChat(storeId, chatId, `🕐 Nuestro horario de atención:\n\n${hours}\n\nFuera de estos horarios, puedes dejar tu mensaje y un vendedor te responderá lo antes posible.`);
  }
}
