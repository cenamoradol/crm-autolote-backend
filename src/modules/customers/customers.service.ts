import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function cleanPhone(phone?: string) {
  if (!phone) return undefined;
  return phone.trim().replace(/\s+/g, '');
}

function cleanText(v?: string) {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) { }

  async list(storeId: string, params: { q?: string; page?: number; pageSize?: number }) {
    const q = params.q?.trim();
    const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 100);
    const page = Math.max(params.page ?? 1, 1);
    const skip = (page - 1) * pageSize;

    const where: any = { storeId };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
        { phone: { contains: q, mode: 'insensitive' as const } },
        { documentId: { contains: q, mode: 'insensitive' as const } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          documentId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items,
    };
  }

  async get(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        documentId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        preferences: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            brandId: true,
            modelId: true,
            yearFrom: true,
            yearTo: true,
            minPrice: true,
            maxPrice: true,
            isActive: true,
            notes: true,
            createdAt: true,
            brand: { select: { id: true, name: true } },
            model: { select: { id: true, name: true } },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            type: true,
            notes: true,
            createdAt: true,
            createdBy: { select: { id: true, fullName: true } },
          },
        },
        sales: {
          orderBy: { soldAt: 'desc' },
          select: {
            id: true,
            soldAt: true,
            soldPrice: true,
            notes: true,
            vehicle: {
              select: {
                id: true,
                publicId: true,
                year: true,
                price: true,
                brand: { select: { id: true, name: true } },
                model: { select: { id: true, name: true } },
                media: {
                  take: 1,
                  orderBy: { position: 'asc' },
                  select: { url: true },
                },
              },
            },
            soldBy: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!customer) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });
    return customer;
  }

  async create(storeId: string, userId: string, dto: { fullName: string; email?: string; phone?: string; documentId?: string }) {
    const email = cleanText(dto.email)?.toLowerCase();
    const phone = cleanPhone(dto.phone);
    const documentId = cleanText(dto.documentId);

    try {
      const customer = await this.prisma.customer.create({
        data: {
          storeId,
          fullName: dto.fullName.trim(),
          email: email ?? null,
          phone: phone ?? null,
          documentId: documentId ?? null,
          createdByUserId: userId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          documentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Log Activity
      await this.prisma.activity.create({
        data: {
          storeId,
          type: 'SYSTEM' as any,
          notes: `Cliente creado: ${customer.fullName}`,
          customerId: customer.id,
          createdByUserId: userId,
        } as any,
      });

      return customer;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({
          code: 'CUSTOMER_DUPLICATE',
          message: 'Ya existe un cliente con ese email o teléfono en esta tienda.',
        });
      }
      throw e;
    }
  }

  async update(
    storeId: string,
    userId: string,
    id: string,
    dto: { fullName?: string; email?: string; phone?: string; documentId?: string },
  ) {
    const current = await this.prisma.customer.findFirst({ where: { id, storeId }, select: { id: true, fullName: true } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });

    const data: any = {};
    if (typeof dto.fullName === 'string') data.fullName = dto.fullName.trim();
    if (typeof dto.email === 'string') data.email = cleanText(dto.email)?.toLowerCase() ?? null;
    if (typeof dto.phone === 'string') data.phone = cleanPhone(dto.phone) ?? null;
    if (typeof dto.documentId === 'string') data.documentId = cleanText(dto.documentId) ?? null;

    try {
      const updated = await this.prisma.customer.update({
        where: { id },
        data,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          documentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Log Activity
      if (Object.keys(data).length > 0) {
        await this.prisma.activity.create({
          data: {
            storeId,
            type: 'SYSTEM' as any,
            notes: `Cliente actualizado: ${updated.fullName}`,
            customerId: updated.id,
            createdByUserId: userId,
          } as any,
        });
      }

      return updated;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({
          code: 'CUSTOMER_DUPLICATE',
          message: 'Ya existe un cliente con ese email o teléfono en esta tienda.',
        });
      }
      throw e;
    }
  }

  async remove(storeId: string, userId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, storeId }, select: { id: true, fullName: true } });
    if (!customer) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });

    const [salesCount, leadsCount, activitiesCount, reservationsCount] = await Promise.all([
      this.prisma.vehicleSale.count({ where: { storeId, customerId: id } }),
      this.prisma.lead.count({ where: { storeId, customerId: id } }),
      this.prisma.activity.count({ where: { storeId, customerId: id, type: { not: 'SYSTEM' as any } } }), // Ignore logs
      this.prisma.vehicleReservation.count({ where: { storeId, customerId: id } }),
    ]);

    // Disclaimer: If there are strictly ONLY system activities, we might allow deletion, but for now let's be strict or cleanup system logs first.
    // However, if we delete the customer, we can't link the activity.
    // Usually validation is for USER generated content.
    // Let's relax validation only for SYSTEM logs if we want to allow deletion, but simple approach:

    if (salesCount > 0 || leadsCount > 0 || reservationsCount > 0) {
      throw new BadRequestException({
        code: 'CUSTOMER_IN_USE',
        message: 'No se puede eliminar: el cliente tiene ventas/leads/reservas asociadas.',
      });
    }

    // We should delete activities or let Cascade handle it? Activity -> Customer is SET NULL usually or CASCADE.
    // Schema says: customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
    // So activities remain but customerId becomes null.

    await this.prisma.customer.delete({ where: { id } });

    // Log deletion as a general store activity or just return ok.
    // Since customer is gone, we can't link it easily unless we keep the ID as text in notes, 
    // but without customer record, it won't show in customer history obviously.
    // We will just log it without link.

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Cliente eliminado: ${customer.fullName} (ID: ${id})`,
        createdByUserId: userId,
      } as any,
    });

    return { ok: true };
  }

  // ── Preferences ──

  async addPreference(
    storeId: string,
    customerId: string,
    dto: { brandId?: string; modelId?: string; yearFrom?: number; yearTo?: number; minPrice?: number; maxPrice?: number; notes?: string },
  ) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, storeId }, select: { id: true } });
    if (!customer) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });

    return this.prisma.customerPreference.create({
      data: {
        storeId,
        customerId,
        brandId: dto.brandId || null,
        modelId: dto.modelId || null,
        yearFrom: dto.yearFrom || null,
        yearTo: dto.yearTo || null,
        minPrice: dto.minPrice || null,
        maxPrice: dto.maxPrice || null,
        notes: dto.notes || null,
      },
      select: {
        id: true,
        brandId: true,
        modelId: true,
        yearFrom: true,
        yearTo: true,
        minPrice: true,
        maxPrice: true,
        isActive: true,
        notes: true,
        createdAt: true,
        brand: { select: { id: true, name: true } },
        model: { select: { id: true, name: true } },
      },
    });
  }

  async removePreference(storeId: string, customerId: string, prefId: string) {
    const pref = await this.prisma.customerPreference.findFirst({ where: { id: prefId, customerId, storeId } });
    if (!pref) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Preferencia no existe.' });

    await this.prisma.customerPreference.delete({ where: { id: prefId } });
    return { ok: true };
  }

  async togglePreference(storeId: string, customerId: string, prefId: string) {
    const pref = await this.prisma.customerPreference.findFirst({
      where: { id: prefId, customerId, storeId },
      select: { id: true, isActive: true },
    });
    if (!pref) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Preferencia no existe.' });

    return this.prisma.customerPreference.update({
      where: { id: prefId },
      data: { isActive: !pref.isActive },
      select: {
        id: true,
        isActive: true,
      },
    });
  }

  // ── Activities ──

  async addActivity(
    storeId: string,
    userId: string,
    customerId: string,
    dto: { type: string; notes?: string },
  ) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, storeId }, select: { id: true } });
    if (!customer) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });

    return this.prisma.activity.create({
      data: {
        storeId,
        type: dto.type as any,
        notes: dto.notes || null,
        customerId,
        createdByUserId: userId,
      } as any,
      select: {
        id: true,
        type: true,
        notes: true,
        createdAt: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });
  }

  // ── Status ──

  async updateStatus(storeId: string, customerId: string, status: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id: customerId, storeId }, select: { id: true } });
    if (!customer) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });

    return this.prisma.customer.update({
      where: { id: customerId },
      data: { status: status as any },
      select: { id: true, status: true },
    });
  }

  // ── Matching Vehicles ──

  async getMatchingVehicles(storeId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, storeId },
      select: {
        preferences: {
          where: { isActive: true },
          select: { brandId: true, modelId: true, yearFrom: true, yearTo: true, minPrice: true, maxPrice: true },
        },
      },
    });
    if (!customer) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });
    if (!customer.preferences.length) return [];

    // Build OR conditions from all active preferences
    const orConditions = customer.preferences.map((p: any) => {
      const cond: any = {};
      if (p.brandId) cond.brandId = p.brandId;
      if (p.modelId) cond.modelId = p.modelId;
      if (p.yearFrom || p.yearTo) {
        cond.year = {};
        if (p.yearFrom) cond.year.gte = p.yearFrom;
        if (p.yearTo) cond.year.lte = p.yearTo;
      }
      if (p.minPrice || p.maxPrice) {
        cond.price = {};
        if (p.minPrice) cond.price.gte = p.minPrice;
        if (p.maxPrice) cond.price.lte = p.maxPrice;
      }
      return cond;
    });

    return this.prisma.vehicle.findMany({
      where: {
        storeId,
        status: 'AVAILABLE',
        OR: orConditions,
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        publicId: true,
        status: true,
        year: true,
        price: true,
        mileage: true,
        createdAt: true,
        brand: { select: { id: true, name: true } },
        model: { select: { id: true, name: true } },
        media: {
          take: 1,
          orderBy: { position: 'asc' },
          select: { url: true },
        },
      },
    });
  }
}
