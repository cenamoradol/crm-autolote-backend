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
        createdAt: true,
        updatedAt: true,
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
}
