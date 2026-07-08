import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { wwebjsManager } from './wwebjs-utils';

export interface OutgoingMessage {
  to: string;
  text?: string;
  imageUrl?: string;
  buttons?: { text: string }[];
}

interface BotMessageConfig {
  welcomeMessage: string;
  fallbackMessage: string;
  vendorRequestMessage: string;
  noVendorsMessage: string;
  vehicleSelectionMessage: string;
  searchPromptMessage: string;
}

@Injectable()
export class WhatsAppMessageService {
  constructor(private readonly prisma: PrismaService) {}

  private async getBotConfig(storeId: string): Promise<BotMessageConfig> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        whatsappWelcomeMessage: true,
        whatsappFallbackMessage: true,
        whatsappVendorRequestMessage: true,
        whatsappNoVendorsMessage: true,
        whatsappVehicleSelectionMessage: true,
        whatsappSearchPromptMessage: true,
      },
    });

    return {
      welcomeMessage:
        store?.whatsappWelcomeMessage ??
        '¡Hola! 👋 Bienvenido al chat de auto-consulta.\n\n' +
          'Puedes buscar vehículos de las siguientes formas:\n\n' +
          '1️⃣ Formato rápido: Marca/Modelo/Año\n' +
          '   Ejemplo: Honda/Civic/2014\n\n' +
          '2️⃣ Solo el nombre: Civic 2014\n\n' +
          '3️⃣ Escribe "vendedor" para hablar con un asesor\n\n' +
          '¿Qué vehículo estás buscando?',
      fallbackMessage:
        store?.whatsappFallbackMessage ??
        '❓ No entendí tu mensaje.\n\nEscribe "Hola" para ver las opciones o busca un vehículo así:\n🚗 Honda/Civic/2014',
      vendorRequestMessage:
        store?.whatsappVendorRequestMessage ?? 'Te estamos asignando a un vendedor...',
      noVendorsMessage:
        store?.whatsappNoVendorsMessage ??
        'En este momento no hay vendedores disponibles. Te contactaremos pronto.',
      vehicleSelectionMessage:
        store?.whatsappVehicleSelectionMessage ??
        '✅ *Selección confirmada*\n\n🚗 Vehículo: {vehicleInfo}\n💰 Precio: {priceText}\n\nUn vendedor te contactará pronto para darte más información.',
      searchPromptMessage:
        store?.whatsappSearchPromptMessage ??
        'Mostrando 5 de {count} resultados. Refina tu búsqueda o contacta a un vendedor.',
    };
  }

  private interpolate(template: string, values: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
  }

  async sendMessage(storeId: string, message: OutgoingMessage): Promise<boolean> {
    try {
      const to = message.to.replace(/\D/g, '');
      console.log(`[WhatsApp] Sending message to ${to} from store ${storeId}`);

      let text = message.text || '';
      if (message.buttons?.length) {
        text += '\n\n';
        message.buttons.forEach((btn, i) => {
          text += `${i + 1}. ${btn.text}\n`;
        });
      }
      
      const sent = await wwebjsManager.sendMessage(storeId, to, text);
      if (!sent) {
        console.error(`[WhatsApp] Failed to send message to ${to}`);
      }
      return sent;
    } catch (error) {
      console.error(`[WhatsApp] Send message failed:`, error);
      return false;
    }
  }

  async sendReplyToChat(storeId: string, chatId: string, text: string): Promise<boolean> {
    try {
      console.log(`[WhatsApp] Sending reply to chat ${chatId}`);
      return await wwebjsManager.sendReplyToChat(storeId, chatId, text);
    } catch (error) {
      console.error(`[WhatsApp] Send reply to chat failed:`, error);
      return false;
    }
  }

  async sendImageToChat(storeId: string, chatId: string, imageUrl: string, caption: string): Promise<boolean> {
    try {
      console.log(`[WhatsApp] Sending image to chat ${chatId}`);
      return await wwebjsManager.sendImageToChat(storeId, chatId, imageUrl, caption);
    } catch (error) {
      console.error(`[WhatsApp] Send image to chat failed:`, error);
      return false;
    }
  }

  async sendVehicleResults(
    storeId: string,
    customerPhone: string,
    vehicles: any[],
  ): Promise<void> {
    const config = await this.getBotConfig(storeId);

    if (vehicles.length === 0) {
      await this.sendMessage(storeId, {
        to: customerPhone,
        text: 'No encontramos vehículos con esos criterios. ¿Deseas buscar otro?',
      });
      return;
    }

    for (const vehicle of vehicles.slice(0, 5)) {
      const price = vehicle.offerPrice || vehicle.price;
      const priceText = price ? `$${Number(price).toLocaleString()}` : 'Precio por consultar';

      let text = `${vehicle.title || `${vehicle.brand?.name} ${vehicle.model?.name}`} ${vehicle.year || ''}\n`;
      text += `${priceText}\n`;
      text += `${vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : ''}\n`;

      await this.sendMessage(storeId, {
        to: customerPhone,
        text,
      });
    }

    if (vehicles.length > 5) {
      await this.sendMessage(storeId, {
        to: customerPhone,
        text: this.interpolate(config.searchPromptMessage, { count: String(vehicles.length) }),
      });
    }
  }

  async sendVehicleResultsToChat(
    storeId: string,
    chatId: string,
    vehicles: any[],
  ): Promise<void> {
    const config = await this.getBotConfig(storeId);

    if (vehicles.length === 0) {
      await this.sendReplyToChat(storeId, chatId, '🔍 No encontramos vehículos con esos criterios.\n\nFormato: Marca/Modelo/Año\nEjemplo: Honda/Civic/2014');
      return;
    }

    const displayVehicles = vehicles.slice(0, 5);
    const selectionOptions: string[] = [];

    for (let i = 0; i < displayVehicles.length; i++) {
      const vehicle = displayVehicles[i];
      const price = vehicle.offerPrice || vehicle.price;
      const priceText = price ? `$${Number(price).toLocaleString()}` : 'Precio por consultar';
      const vehicleName = `${vehicle.brand?.name || ''} ${vehicle.model?.name || ''} ${vehicle.year || ''}`.trim();

      let caption = `${i + 1}️⃣ *${vehicleName}*\n`;
      caption += `💰 ${priceText}\n`;
      caption += `${vehicle.mileage ? `📏 ${vehicle.mileage.toLocaleString()} km\n` : ''}`;
      if (vehicle.color) caption += `🎨 ${vehicle.color}\n`;
      caption += `\nResponde *${i + 1}* para seleccionar`;

      const coverMedia = vehicle.media?.[0];
      if (coverMedia?.url) {
        await this.sendImageToChat(storeId, chatId, coverMedia.url, caption);
      } else {
        await this.sendReplyToChat(storeId, chatId, caption);
      }
      selectionOptions.push(`${i + 1}`);
    }

    if (displayVehicles.length > 1) {
      const optionsText = selectionOptions.join(', ');
      await this.sendReplyToChat(storeId, chatId,
        `📋 *Selecciona un vehículo:*\n\nResponde con el *número* de tu elección: ${optionsText}\n\nO escribe *"vendedor"* para hablar con un asesor.`
      );
    } else if (displayVehicles.length === 1) {
      await this.sendReplyToChat(storeId, chatId, `Escribe *"vendedor"* si te interesa este vehículo y un asesor te atenderá.`);
    }

    if (vehicles.length > 5) {
      await this.sendReplyToChat(storeId, chatId, this.interpolate(config.searchPromptMessage, { count: String(vehicles.length) }));
    }
  }

  async sendVendorAssignment(
    storeId: string,
    customerPhone: string,
    vendorName: string,
    vendorPhone: string,
  ): Promise<void> {
    const config = await this.getBotConfig(storeId);
    const link = `https://wa.me/${vendorPhone.replace(/\D/g, '')}?text=Hola,%20me%20interesa%20un%20vehículo%20que%20vi%20en%20su%20inventario.`;

    await this.sendMessage(storeId, {
      to: customerPhone,
      text: config.vendorRequestMessage,
    });

    await this.sendMessage(storeId, {
      to: customerPhone,
      text: `Has sido derivado a ${vendorName}. Un vendedor te atenderá pronto.\n\nTambién puedes contactarlo directamente: ${link}`,
    });
  }

  async sendVendorAssignmentToChat(
    storeId: string,
    chatId: string,
    vendorName: string,
    vendorPhone: string,
  ): Promise<void> {
    const config = await this.getBotConfig(storeId);
    const link = `https://wa.me/${vendorPhone.replace(/\D/g, '')}?text=Hola,%20me%20interesa%20un%20vehículo%20que%20vi%20en%20su%20inventario.`;

    await this.sendReplyToChat(storeId, chatId, `👤 ${config.vendorRequestMessage}`);

    await this.sendReplyToChat(storeId, chatId, `✅ Has sido derivado a ${vendorName}.\nUn vendedor te atenderá pronto.\n\n📱 Contacto directo: ${link}`);
  }

  async sendClosedHoursMessage(storeId: string, customerPhone: string): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { whatsappClosedMessage: true, whatsappTimezone: true },
    });

    const defaultMessage =
      'Gracias por escribirnos. Fuera de horario de atención. ' +
      'Un vendedor te contactará lo antes posible.';

    const message = store?.whatsappClosedMessage || defaultMessage;

    await this.sendMessage(storeId, {
      to: customerPhone,
      text: message,
    });
  }

  async sendClosedHoursMessageToChat(storeId: string, chatId: string): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { whatsappClosedMessage: true, whatsappTimezone: true },
    });

    const defaultMessage =
      'Gracias por escribirnos. Fuera de horario de atención. ' +
      'Un vendedor te contactará lo antes posible.';

    const message = store?.whatsappClosedMessage || defaultMessage;

    await this.sendReplyToChat(storeId, chatId, message);
  }

  async sendWelcomeMessage(storeId: string, customerPhone: string): Promise<void> {
    const config = await this.getBotConfig(storeId);
    await this.sendMessage(storeId, {
      to: customerPhone,
      text: config.welcomeMessage,
    });
  }

  async sendWelcomeMessageToChat(storeId: string, chatId: string): Promise<boolean> {
    const config = await this.getBotConfig(storeId);
    return await this.sendReplyToChat(storeId, chatId, config.welcomeMessage);
  }

  async getVehicleSelectionMessage(
    storeId: string,
    vehicleInfo: string,
    priceText: string,
  ): Promise<string> {
    const config = await this.getBotConfig(storeId);
    return this.interpolate(config.vehicleSelectionMessage, { vehicleInfo, priceText });
  }

  async getNoVendorsMessage(storeId: string): Promise<string> {
    const config = await this.getBotConfig(storeId);
    return config.noVendorsMessage;
  }

  async getFallbackMessage(storeId: string): Promise<string> {
    const config = await this.getBotConfig(storeId);
    return config.fallbackMessage;
  }
}
