import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid, customAlphabet } from 'nanoid';

const genPublicId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) { }

  async list(storeId: string, q: { status?: VehicleStatus; published?: string; search?: string }) {
    const where: Prisma.VehicleWhereInput = { storeId, status: { not: 'ARCHIVED' } };

    if (q.status) where.status = q.status;
    if (q.published === 'true') where.isPublished = true;
    if (q.published === 'false') where.isPublished = false;

    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { publicId: { contains: q.search, mode: 'insensitive' } },
        { brand: { name: { contains: q.search, mode: 'insensitive' } } },
        { model: { name: { contains: q.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.vehicle.findMany({
      where,
      include: { brand: true, model: true, branch: true, media: { orderBy: { position: 'asc' } }, sale: { include: { customer: true, lead: true, soldBy: true } }, vehicleType: true, consignor: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(storeId: string, id: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id, storeId },
      include: { brand: true, model: true, branch: true, media: { orderBy: { position: 'asc' } }, reservation: { include: { customer: true, lead: true } }, sale: { include: { customer: true, lead: true, soldBy: true } }, vehicleType: true, consignor: true, createdBy: true },
    });
    if (!v) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });
    return v;
  }

  async create(storeId: string, userId: string, dto: any) {
    // validar branch pertenece al store
    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, storeId } });
    if (!branch) throw new BadRequestException({ code: 'INVALID_BRANCH', message: 'Branch inválido.' });

    const vehicle = await this.prisma.vehicle.create({
      data: {
        storeId,
        branchId: dto.branchId,
        publicId: genPublicId(),
        brandId: dto.brandId,
        modelId: dto.modelId,
        vehicleTypeId: dto.vehicleTypeId,
        title: dto.title,
        description: dto.description,
        year: dto.year,
        vin: dto.vin,
        mileage: dto.mileage,
        color: dto.color,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        engineSize: dto.engineSize,
        price: dto.price ? new Prisma.Decimal(dto.price) : undefined,
        isPublished: dto.isPublished ?? false,
        consignorId: dto.consignorId,
        createdByUserId: userId,
        status: 'AVAILABLE',
      },
    });

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Vehículo creado: ${vehicle.title || vehicle.publicId}`,
        vehicleId: vehicle.id,
        createdByUserId: userId,
      } as any,
    });

    return vehicle;
  }

  async update(storeId: string, userId: string, id: string, dto: any) {
    const current = await this.prisma.vehicle.findFirst({ where: { id, storeId }, select: { id: true, title: true } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, storeId } });
      if (!branch) throw new BadRequestException({ code: 'INVALID_BRANCH', message: 'Branch inválido.' });
    }

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        branchId: dto.branchId,
        brandId: dto.brandId,
        modelId: dto.modelId,
        vehicleTypeId: dto.vehicleTypeId,
        title: dto.title,
        description: dto.description,
        year: dto.year,
        vin: dto.vin,
        mileage: dto.mileage,
        color: dto.color,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        engineSize: dto.engineSize,
        price: dto.price ? new Prisma.Decimal(dto.price) : dto.price === null ? null : undefined,
        isPublished: typeof dto.isPublished === 'boolean' ? dto.isPublished : undefined,
        consignorId: dto.consignorId,
      },
    });

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Vehículo actualizado: ${updated.title || current.title}`,
        vehicleId: updated.id,
        createdByUserId: userId,
      } as any,
    });

    return updated;
  }

  async archive(storeId: string, userId: string, id: string) {
    const current = await this.prisma.vehicle.findFirst({ where: { id, storeId }, select: { id: true, title: true } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });

    await this.prisma.vehicle.update({
      where: { id },
      data: { status: 'ARCHIVED', isPublished: false },
    });

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Vehículo archivado: ${current.title}`,
        vehicleId: current.id,
        createdByUserId: userId,
      } as any,
    });

    return { ok: true };
  }

  async setPublish(storeId: string, userId: string, id: string, isPublished: boolean) {
    const current = await this.prisma.vehicle.findFirst({ where: { id, storeId }, select: { id: true, title: true } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });

    await this.prisma.vehicle.update({
      where: { id },
      data: { isPublished },
    });

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Vehículo ${isPublished ? 'publicado' : 'despublicado'}: ${current.title}`,
        vehicleId: current.id,
        createdByUserId: userId,
      } as any,
    });

    return { ok: true };
  }
}
