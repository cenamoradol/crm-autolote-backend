import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string, q: { status?: VehicleStatus; published?: string }) {
    const where: Prisma.VehicleWhereInput = { storeId, status: { not: 'ARCHIVED' } };

    if (q.status) where.status = q.status;
    if (q.published === 'true') where.isPublished = true;
    if (q.published === 'false') where.isPublished = false;

    return this.prisma.vehicle.findMany({
      where,
      include: { brand: true, model: true, branch: true, media: true, sale: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(storeId: string, id: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id, storeId },
      include: { brand: true, model: true, branch: true, media: true, reservation: true, sale: true },
    });
    if (!v) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });
    return v;
  }

  async create(storeId: string, userId: string, dto: any) {
    // validar branch pertenece al store
    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, storeId } });
    if (!branch) throw new BadRequestException({ code: 'INVALID_BRANCH', message: 'Branch inválido.' });

    return this.prisma.vehicle.create({
      data: {
        storeId,
        branchId: dto.branchId,
        publicId: nanoid(10),
        brandId: dto.brandId,
        modelId: dto.modelId,
        title: dto.title,
        description: dto.description,
        year: dto.year,
        vin: dto.vin,
        mileage: dto.mileage,
        color: dto.color,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        price: dto.price ? new Prisma.Decimal(dto.price) : undefined,
        isPublished: dto.isPublished ?? false,
        createdByUserId: userId,
        status: 'AVAILABLE',
      },
    });
  }

  async update(storeId: string, id: string, dto: any) {
    const current = await this.prisma.vehicle.findFirst({ where: { id, storeId } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, storeId } });
      if (!branch) throw new BadRequestException({ code: 'INVALID_BRANCH', message: 'Branch inválido.' });
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        branchId: dto.branchId,
        brandId: dto.brandId,
        modelId: dto.modelId,
        title: dto.title,
        description: dto.description,
        year: dto.year,
        vin: dto.vin,
        mileage: dto.mileage,
        color: dto.color,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        price: dto.price ? new Prisma.Decimal(dto.price) : dto.price === null ? null : undefined,
        isPublished: typeof dto.isPublished === 'boolean' ? dto.isPublished : undefined,
      },
    });
  }

  async archive(storeId: string, id: string) {
    const current = await this.prisma.vehicle.findFirst({ where: { id, storeId } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });

    return this.prisma.vehicle.update({
      where: { id },
      data: { status: 'ARCHIVED', isPublished: false },
    });
  }

  async setPublish(storeId: string, id: string, isPublished: boolean) {
    const current = await this.prisma.vehicle.findFirst({ where: { id, storeId } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });

    return this.prisma.vehicle.update({
      where: { id },
      data: { isPublished },
    });
  }
}
