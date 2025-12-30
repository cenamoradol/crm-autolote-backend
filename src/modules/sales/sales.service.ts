import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string, q: { soldByUserId?: string }) {
    return this.prisma.vehicleSale.findMany({
      where: {
        storeId,
        ...(q.soldByUserId ? { soldByUserId: q.soldByUserId } : {}),
      },
      include: {
        vehicle: { include: { brand: true, model: true, branch: true } },
        customer: true,
        lead: true,
        soldBy: { select: { id: true, email: true, fullName: true } },
      },
      orderBy: { soldAt: 'desc' },
    });
  }

  async create(storeId: string, soldByUserId: string, dto: any) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, storeId },
    });
    if (!vehicle) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });
    if (vehicle.status === 'SOLD') throw new BadRequestException({ code: 'ALREADY_SOLD', message: 'Vehículo ya vendido.' });
    if (vehicle.status === 'ARCHIVED') throw new BadRequestException({ code: 'ARCHIVED', message: 'Vehículo archivado.' });

    // customer/lead opcionales pero si vienen, validarlos del mismo store
    if (dto.customerId) {
      const c = await this.prisma.customer.findFirst({ where: { id: dto.customerId, storeId } });
      if (!c) throw new BadRequestException({ code: 'INVALID_CUSTOMER', message: 'Customer inválido.' });
    }
    if (dto.leadId) {
      const l = await this.prisma.lead.findFirst({ where: { id: dto.leadId, storeId } });
      if (!l) throw new BadRequestException({ code: 'INVALID_LEAD', message: 'Lead inválido.' });
    }

    const now = new Date();

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vehicleSale.create({
        data: {
          storeId,
          vehicleId: dto.vehicleId,
          soldByUserId,
          customerId: dto.customerId,
          leadId: dto.leadId,
          soldAt: now,
          soldPrice: dto.soldPrice ? new Prisma.Decimal(dto.soldPrice) : undefined,
          notes: dto.notes,
        },
      });

      await tx.vehicle.update({
        where: { id: dto.vehicleId },
        data: {
          status: 'SOLD',
          isPublished: false,
          soldAt: now,
          soldPrice: dto.soldPrice ? new Prisma.Decimal(dto.soldPrice) : undefined,
        },
      });

      await tx.vehicleStatusHistory.create({
        data: {
          vehicleId: dto.vehicleId,
          fromStatus: vehicle.status,
          toStatus: 'SOLD',
          changedByUserId: soldByUserId,
          changedAt: now,
        },
      });

      return created;
    });

    return this.prisma.vehicleSale.findFirst({
      where: { id: sale.id, storeId },
      include: {
        vehicle: { include: { brand: true, model: true, branch: true } },
        customer: true,
        lead: true,
        soldBy: { select: { id: true, email: true, fullName: true } },
      },
    });
  }
}
