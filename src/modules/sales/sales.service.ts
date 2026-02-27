import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../common/r2/r2.service';
import { randomUUID } from 'crypto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) { }

  async list(storeId: string, q: { soldByUserId?: string }) {
    return this.prisma.vehicleSale.findMany({
      where: {
        storeId,
        ...(q.soldByUserId ? { soldByUserId: q.soldByUserId } : {}),
      },
      include: {
        vehicle: { include: { brand: true, model: true, branch: true, media: { take: 1, where: { isCover: true } } } },
        customer: true,
        lead: true,
        soldBy: { select: { id: true, email: true, fullName: true } },
        documents: true,
      },
      orderBy: { soldAt: 'desc' },
    });
  }

  private async canModifySale(storeId: string, saleId: string, userId: string): Promise<boolean> {
    const sale = await this.prisma.vehicleSale.findFirst({
      where: { id: saleId, storeId },
      select: { status: true } as any,
    });
    if (!sale) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Venta no encontrada.' });

    if ((sale as any).status !== 'COMPLETED') return true;
    // En realidad, si está COMPLETED es cuando queremos el lock.

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    if (user?.isSuperAdmin) return true;

    const memberships = await this.prisma.userRole.findMany({
      where: { userId, storeId },
    });

    const overridePerm = 'sales:override_closed';
    for (const ur of memberships) {
      if (ur.permissions) {
        const perms = ur.permissions as Record<string, string[]>;
        if (perms.sales?.includes('override_closed')) return true;
      }
    }

    throw new BadRequestException({
      code: 'SALE_LOCKED',
      message: 'Esta venta está cerrada y no se puede modificar sin permisos especiales.',
    });
  }

  async create(storeId: string, currentUserId: string, dto: any) {
    const soldByUserId = dto.soldByUserId || currentUserId;
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
          soldAt: now,
          soldPrice: dto.soldPrice ? new Prisma.Decimal(dto.soldPrice) : undefined,
        },
      });

      await tx.vehicleStatusHistory.create({
        data: {
          vehicleId: dto.vehicleId,
          fromStatus: vehicle.status,
          toStatus: 'SOLD',
          changedByUserId: currentUserId,
          changedAt: now,
        },
      });

      return created;
    });

    // Auto-update customer status to PURCHASED
    if (dto.customerId) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { status: 'PURCHASED' as any },
      });
      await this.prisma.activity.create({
        data: {
          storeId,
          type: 'SYSTEM' as any,
          notes: `Cliente marcado como COMPRÓ — Venta de vehículo ${vehicle.publicId || dto.vehicleId}`,
          customerId: dto.customerId,
          createdByUserId: currentUserId,
        } as any,
      });
    }

    return this.prisma.vehicleSale.findFirst({
      where: { id: sale.id, storeId },
      include: {
        vehicle: { include: { brand: true, model: true, branch: true } },
        customer: true,
        lead: true,
        soldBy: { select: { id: true, email: true, fullName: true } },
        documents: true,
      },
    });
  }

  async update(storeId: string, id: string, userId: string, dto: any) {
    await this.canModifySale(storeId, id, userId);

    const sale = await this.prisma.vehicleSale.findFirst({
      where: { id, storeId },
    });
    if (!sale) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Venta no encontrada.' });

    const data: any = {
      customerId: dto.customerId,
      leadId: dto.leadId,
      notes: dto.notes,
      soldByUserId: dto.soldByUserId,
      soldPrice: dto.soldPrice ? new Prisma.Decimal(dto.soldPrice) : undefined,
    };

    // Remove undefined
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    const updatedSale = await this.prisma.vehicleSale.update({
      where: { id },
      data,
      include: {
        vehicle: { include: { brand: true, model: true, branch: true } },
        customer: true,
        lead: true,
        soldBy: { select: { id: true, email: true, fullName: true } },
        documents: true,
      },
    });

    // Auto-update customer status to PURCHASED if customerId is added during update
    if (dto.customerId && dto.customerId !== sale.customerId) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { status: 'PURCHASED' as any },
      });
      await this.prisma.activity.create({
        data: {
          storeId,
          type: 'SYSTEM' as any,
          notes: `Cliente vinculado a venta y marcado como COMPRÓ — Venta de vehículo ${sale.vehicleId}`,
          customerId: dto.customerId,
          createdByUserId: userId,
        } as any,
      });
    }

    return updatedSale;
  }

  async addDocument(storeId: string, saleId: string, userId: string, dto: { name: string; fileKey: string; url: string }) {
    await this.canModifySale(storeId, saleId, userId);
    const sale = await this.prisma.vehicleSale.findFirst({ where: { id: saleId, storeId } });
    if (!sale) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Venta no encontrada.' });

    return this.prisma.saleDocument.create({
      data: {
        saleId,
        name: dto.name,
        fileKey: dto.fileKey,
        url: dto.url,
      },
    });
  }

  async removeDocument(storeId: string, saleId: string, userId: string, docId: string) {
    await this.canModifySale(storeId, saleId, userId);
    const doc = await this.prisma.saleDocument.findFirst({
      where: { id: docId, saleId, sale: { storeId } },
    });
    if (!doc) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Documento no encontrado.' });

    return this.prisma.saleDocument.delete({ where: { id: docId } });
  }

  async uploadDocument(storeId: string, saleId: string, userId: string, file: Express.Multer.File) {
    await this.canModifySale(storeId, saleId, userId);
    const sale = await this.prisma.vehicleSale.findFirst({ where: { id: saleId, storeId } });
    if (!sale) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Venta no encontrada.' });

    if (!file || !file.buffer) throw new BadRequestException({ code: 'FILE_REQUIRED', message: 'Archivo requerido.' });

    const id = randomUUID();
    const ext = file.originalname.split('.').pop() || 'bin';
    const fileKey = `stores/${storeId}/sales/${saleId}/documents/${id}.${ext}`;

    await this.r2.uploadObject(fileKey, file.buffer, file.mimetype);
    const url = this.r2.buildPublicUrl(fileKey);

    return this.prisma.saleDocument.create({
      data: {
        saleId,
        name: file.originalname,
        fileKey,
        url,
      },
    });
  }
}
