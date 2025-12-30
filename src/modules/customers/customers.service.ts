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
  constructor(private readonly prisma: PrismaService) {}

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

  async create(storeId: string, dto: { fullName: string; email?: string; phone?: string; documentId?: string }) {
    const email = cleanText(dto.email)?.toLowerCase();
    const phone = cleanPhone(dto.phone);
    const documentId = cleanText(dto.documentId);

    try {
      return await this.prisma.customer.create({
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
    id: string,
    dto: { fullName?: string; email?: string; phone?: string; documentId?: string },
  ) {
    const current = await this.prisma.customer.findFirst({ where: { id, storeId }, select: { id: true } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });

    const data: any = {};
    if (typeof dto.fullName === 'string') data.fullName = dto.fullName.trim();
    if (typeof dto.email === 'string') data.email = cleanText(dto.email)?.toLowerCase() ?? null;
    if (typeof dto.phone === 'string') data.phone = cleanPhone(dto.phone) ?? null;
    if (typeof dto.documentId === 'string') data.documentId = cleanText(dto.documentId) ?? null;

    try {
      return await this.prisma.customer.update({
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

  async remove(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { id, storeId }, select: { id: true } });
    if (!customer) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Customer no existe.' });

    const [salesCount, leadsCount, activitiesCount, reservationsCount] = await Promise.all([
      this.prisma.vehicleSale.count({ where: { storeId, customerId: id } }),
      this.prisma.lead.count({ where: { storeId, customerId: id } }),
      this.prisma.activity.count({ where: { storeId, customerId: id } }),
      this.prisma.vehicleReservation.count({ where: { storeId, customerId: id } }),
    ]);

    if (salesCount > 0 || leadsCount > 0 || activitiesCount > 0 || reservationsCount > 0) {
      throw new BadRequestException({
        code: 'CUSTOMER_IN_USE',
        message: 'No se puede eliminar: el cliente tiene ventas/leads/actividades/reservas asociadas.',
      });
    }

    await this.prisma.customer.delete({ where: { id } });
    return { ok: true };
  }
}
