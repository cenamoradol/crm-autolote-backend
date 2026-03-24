import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Categories ────────────────────────────────────────────

  async listCategories(storeId: string) {
    return this.prisma.eventCategory.findMany({
      where: { storeId },
      include: { _count: { select: { events: true } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createCategory(storeId: string, dto: CreateEventCategoryDto) {
    const slug = slugify(dto.name);

    const existing = await this.prisma.eventCategory.findUnique({
      where: { storeId_slug: { storeId, slug } },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'DUPLICATE_SLUG',
        message: 'Ya existe una categoría con ese nombre.',
      });
    }

    return this.prisma.eventCategory.create({
      data: {
        storeId,
        name: dto.name,
        slug,
        description: dto.description,
        position: dto.position ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(storeId: string, id: string, dto: UpdateEventCategoryDto) {
    const cat = await this.prisma.eventCategory.findFirst({
      where: { id, storeId },
    });
    if (!cat) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Categoría no existe.' });

    const data: any = { ...dto };
    if (dto.name) {
      data.slug = slugify(dto.name);

      const existing = await this.prisma.eventCategory.findFirst({
        where: { storeId, slug: data.slug, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException({
          code: 'DUPLICATE_SLUG',
          message: 'Ya existe otra categoría con ese nombre.',
        });
      }
    }

    return this.prisma.eventCategory.update({ where: { id }, data });
  }

  async deleteCategory(storeId: string, id: string) {
    const cat = await this.prisma.eventCategory.findFirst({
      where: { id, storeId },
    });
    if (!cat) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Categoría no existe.' });

    await this.prisma.eventCategory.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Events ────────────────────────────────────────────────

  async listEvents(storeId: string, categoryId?: string) {
    const where: any = { storeId };
    if (categoryId) where.categoryId = categoryId;

    return this.prisma.event.findMany({
      where,
      include: {
        category: true,
        _count: { select: { media: true, vehicles: true } },
        media: { where: { isCover: true }, take: 1 },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getEvent(storeId: string, id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, storeId },
      include: {
        category: true,
        media: { orderBy: { position: 'asc' } },
        vehicles: {
          orderBy: { position: 'asc' },
          include: {
            vehicle: {
              include: {
                brand: true,
                model: true,
                media: { where: { isCover: true }, take: 1 },
              },
            },
          },
        },
      },
    });
    if (!event) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Evento no existe.' });
    return event;
  }

  async createEvent(storeId: string, dto: CreateEventDto) {
    // Verify category belongs to store
    const cat = await this.prisma.eventCategory.findFirst({
      where: { id: dto.categoryId, storeId },
    });
    if (!cat) {
      throw new BadRequestException({ code: 'INVALID_CATEGORY', message: 'Categoría inválida.' });
    }

    const slug = slugify(dto.name);

    const existing = await this.prisma.event.findUnique({
      where: { storeId_slug: { storeId, slug } },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'DUPLICATE_SLUG',
        message: 'Ya existe un evento con ese nombre.',
      });
    }

    return this.prisma.event.create({
      data: {
        storeId,
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        isPublished: dto.isPublished ?? false,
        position: dto.position ?? 0,
      },
      include: { category: true },
    });
  }

  async updateEvent(storeId: string, id: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findFirst({ where: { id, storeId } });
    if (!event) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Evento no existe.' });

    if (dto.categoryId) {
      const cat = await this.prisma.eventCategory.findFirst({
        where: { id: dto.categoryId, storeId },
      });
      if (!cat) throw new BadRequestException({ code: 'INVALID_CATEGORY', message: 'Categoría inválida.' });
    }

    const data: any = { ...dto };
    if (dto.name) {
      data.slug = slugify(dto.name);

      const existing = await this.prisma.event.findFirst({
        where: { storeId, slug: data.slug, id: { not: id } },
      });
      if (existing) {
        throw new BadRequestException({
          code: 'DUPLICATE_SLUG',
          message: 'Ya existe otro evento con ese nombre.',
        });
      }
    }
    if (dto.date) data.date = new Date(dto.date);

    return this.prisma.event.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async setPublish(storeId: string, id: string, isPublished: boolean) {
    const event = await this.prisma.event.findFirst({ where: { id, storeId } });
    if (!event) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Evento no existe.' });

    return this.prisma.event.update({
      where: { id },
      data: { isPublished },
    });
  }

  async deleteEvent(storeId: string, id: string) {
    const event = await this.prisma.event.findFirst({ where: { id, storeId } });
    if (!event) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Evento no existe.' });

    await this.prisma.event.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Event Vehicles ────────────────────────────────────────

  async addVehicles(storeId: string, eventId: string, vehicleIds: string[]) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, storeId } });
    if (!event) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Evento no existe.' });

    // Verify all vehicles belong to store
    const vehicles = await this.prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, storeId },
      select: { id: true },
    });
    if (vehicles.length !== vehicleIds.length) {
      throw new BadRequestException({ code: 'INVALID_VEHICLES', message: 'Uno o más vehículos no son válidos.' });
    }

    // Get max position
    const maxPos = (await this.prisma.eventVehicle.aggregate({
      where: { eventId },
      _max: { position: true },
    }))._max.position ?? -1;

    const created: any[] = [];
    for (let i = 0; i < vehicleIds.length; i++) {
      try {
        const ev = await this.prisma.eventVehicle.create({
          data: {
            eventId,
            vehicleId: vehicleIds[i],
            position: maxPos + 1 + i,
          },
          include: {
            vehicle: {
              include: { brand: true, model: true, media: { where: { isCover: true }, take: 1 } },
            },
          },
        });
        created.push(ev);
      } catch (e: any) {
        // Skip duplicates (unique constraint)
        if (e.code === 'P2002') continue;
        throw e;
      }
    }

    return { ok: true, count: created.length, data: created };
  }

  async removeVehicle(storeId: string, eventId: string, vehicleId: string) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, storeId } });
    if (!event) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Evento no existe.' });

    const ev = await this.prisma.eventVehicle.findFirst({
      where: { eventId, vehicleId },
    });
    if (!ev) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no está en este evento.' });

    await this.prisma.eventVehicle.delete({ where: { id: ev.id } });
    return { ok: true };
  }
}
