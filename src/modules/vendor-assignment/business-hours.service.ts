import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Injectable()
export class BusinessHoursService {
  constructor(private readonly prisma: PrismaService) {}

  async isWithinBusinessHours(storeId: string): Promise<boolean> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { whatsappTimezone: true },
    });

    const timezone = store?.whatsappTimezone || 'America/Mexico_City';
    const now = new Date();
    const localTime = this.getLocalTime(now, timezone);

    const dayOfWeek = localTime.getDay();
    const currentTime = `${localTime.getHours().toString().padStart(2, '0')}:${localTime.getMinutes().toString().padStart(2, '0')}`;

    const hours = await this.prisma.whatsAppBusinessHours.findUnique({
      where: {
        storeId_dayOfWeek: { storeId, dayOfWeek },
      },
    });

    if (!hours || !hours.isActive) {
      return false;
    }

    return currentTime >= hours.openTime && currentTime <= hours.closeTime;
  }

  async getSchedule(storeId: string) {
    const hours = await this.prisma.whatsAppBusinessHours.findMany({
      where: { storeId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return hours;
  }

  async getFormattedSchedule(storeId: string): Promise<string> {
    const hours = await this.getSchedule(storeId);

    if (hours.length === 0) {
      return 'Horario no configurado';
    }

    const activeHours = hours.filter((h) => h.isActive);

    if (activeHours.length === 0) {
      return 'Estamos cerrados permanentemente';
    }

    const formattedDays = activeHours.map((h) => {
      const dayName = DAY_NAMES[h.dayOfWeek];
      return `${dayName}: ${this.formatTime(h.openTime)} - ${this.formatTime(h.closeTime)}`;
    });

    return formattedDays.join('\n');
  }

  async setHours(
    storeId: string,
    dayOfWeek: number,
    openTime: string,
    closeTime: string,
    isActive: boolean = true,
  ): Promise<void> {
    await this.prisma.whatsAppBusinessHours.upsert({
      where: {
        storeId_dayOfWeek: { storeId, dayOfWeek },
      },
      create: {
        storeId,
        dayOfWeek,
        openTime,
        closeTime,
        isActive,
      },
      update: {
        openTime,
        closeTime,
        isActive,
      },
    });
  }

  async setDefaultSchedule(storeId: string): Promise<void> {
    const defaultSchedule = [
      { day: 1, open: '09:00', close: '18:00' },
      { day: 2, open: '09:00', close: '18:00' },
      { day: 3, open: '09:00', close: '18:00' },
      { day: 4, open: '09:00', close: '18:00' },
      { day: 5, open: '09:00', close: '18:00' },
      { day: 6, open: '09:00', close: '13:00' },
      { day: 0, open: '00:00', close: '00:00', active: false },
    ];

    for (const day of defaultSchedule) {
      await this.setHours(
        storeId,
        day.day,
        day.open,
        day.close,
        day.active !== false,
      );
    }
  }

  async deleteHours(storeId: string, dayOfWeek: number): Promise<void> {
    await this.prisma.whatsAppBusinessHours.deleteMany({
      where: { storeId, dayOfWeek },
    });
  }

  private getLocalTime(date: Date, timezone: string): Date {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const parts = formatter.formatToParts(date);
      const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

      const localDate = new Date(date);
      localDate.setHours(hour, minute, 0, 0);
      return localDate;
    } catch {
      return date;
    }
  }

  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);

    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
}
