import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid, customAlphabet } from 'nanoid';

const genPublicId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 10);

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) { }

  private async canModifyVehicle(storeId: string, vehicleId: string, userId: string): Promise<boolean> {
    const v = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, storeId },
      select: { status: true },
    });
    if (!v) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });

    if (v.status !== 'SOLD') return true;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });
    if (user?.isSuperAdmin) return true;

    const memberships = await this.prisma.userRole.findMany({
      where: { userId, storeId },
      include: { permissionSet: true },
    });

    for (const ur of memberships) {
      // 1. Direct permissions (overrides)
      if (ur.permissions) {
        const perms = ur.permissions as Record<string, string[]>;
        if (perms.sales?.includes('override_closed')) return true;
      }
      // 2. Permission Set permissions
      if ((ur as any).permissionSet?.permissions) {
        const setPerms = (ur as any).permissionSet.permissions as Record<string, string[]>;
        if (setPerms.sales?.includes('override_closed')) return true;
      }
    }

    throw new BadRequestException({
      code: 'VEHICLE_SOLD',
      message: 'Este vehículo ya está vendido y no se puede modificar por seguridad.',
    });
  }

  async list(storeId: string, q: { status?: VehicleStatus; published?: string; search?: string; clearance?: string }) {
    const where: Prisma.VehicleWhereInput = { storeId, status: { not: 'ARCHIVED' } };

    if (q.status) where.status = q.status;
    if (q.published === 'true') where.isPublished = true;
    if (q.published === 'false') where.isPublished = false;
    if (q.clearance === 'true') {
      where.isClearance = true;
    } else if (q.clearance === 'false') {
      where.isClearance = false;
    }

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
      include: { brand: true, model: true, branch: true, colorRef: true, media: { orderBy: { position: 'asc' } }, sale: { include: { customer: true, lead: true, soldBy: true } }, vehicleType: true, consignor: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(storeId: string, id: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id, storeId },
      include: { brand: true, model: true, branch: true, colorRef: true, media: { orderBy: { position: 'asc' } }, reservation: { include: { customer: true, lead: true } }, sale: { include: { customer: true, lead: true, soldBy: true } }, vehicleType: true, consignor: true, createdBy: true },
    });
    if (!v) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });
    return v;
  }

  async create(storeId: string, userId: string, dto: any) {
    // validar branch pertenece al store
    const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, storeId } });
    if (!branch) throw new BadRequestException({ code: 'INVALID_BRANCH', message: 'Branch inválido.' });

    if (dto.vin) {
      const existing = await this.prisma.vehicle.findFirst({
        where: { storeId, vin: dto.vin },
      });
      if (existing) {
        throw new BadRequestException({
          code: 'DUPLICATE_VIN',
          message: 'Ya existe un vehículo con este VIN.',
        });
      }
    }

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
        colorId: dto.colorId,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        engineSize: dto.engineSize,
        price: dto.price ? new Prisma.Decimal(dto.price) : undefined,
        offerPrice: dto.offerPrice ? new Prisma.Decimal(dto.offerPrice) : undefined,
        clearancePrice: dto.clearancePrice ? new Prisma.Decimal(dto.clearancePrice) : undefined,
        plate: dto.plate,
        purchasePrice: dto.purchasePrice ? new Prisma.Decimal(dto.purchasePrice) : undefined,
        repairCosts: dto.repairCosts ? new Prisma.Decimal(dto.repairCosts) : undefined,
        paperworkCosts: dto.paperworkCosts ? new Prisma.Decimal(dto.paperworkCosts) : undefined,
        otherCosts: dto.otherCosts ? new Prisma.Decimal(dto.otherCosts) : undefined,
        isPublished: dto.isPublished ?? false,
        isClearance: dto.isClearance ?? false,
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
    await this.canModifyVehicle(storeId, id, userId);
    const current = await this.prisma.vehicle.findFirst({ where: { id, storeId }, select: { id: true, title: true, vin: true } });
    if (!current) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Vehículo no existe.' });

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({ where: { id: dto.branchId, storeId } });
      if (!branch) throw new BadRequestException({ code: 'INVALID_BRANCH', message: 'Branch inválido.' });
    }

    if (dto.vin && dto.vin !== current.vin) {
      const existing = await this.prisma.vehicle.findFirst({
        where: { storeId, vin: dto.vin },
      });
      if (existing) {
        throw new BadRequestException({
          code: 'DUPLICATE_VIN',
          message: 'Ya existe otro vehículo con este VIN en esta tienda.',
        });
      }
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
        colorId: dto.colorId,
        transmission: dto.transmission,
        fuelType: dto.fuelType,
        engineSize: dto.engineSize,
        price: dto.price ? new Prisma.Decimal(dto.price) : dto.price === null ? null : undefined,
        offerPrice: dto.offerPrice ? new Prisma.Decimal(dto.offerPrice) : dto.offerPrice === null ? null : undefined,
        clearancePrice: dto.clearancePrice ? new Prisma.Decimal(dto.clearancePrice) : dto.clearancePrice === null ? null : undefined,
        plate: dto.plate,
        purchasePrice: dto.purchasePrice ? new Prisma.Decimal(dto.purchasePrice) : dto.purchasePrice === null ? null : undefined,
        repairCosts: dto.repairCosts ? new Prisma.Decimal(dto.repairCosts) : dto.repairCosts === null ? null : undefined,
        paperworkCosts: dto.paperworkCosts ? new Prisma.Decimal(dto.paperworkCosts) : dto.paperworkCosts === null ? null : undefined,
        otherCosts: dto.otherCosts ? new Prisma.Decimal(dto.otherCosts) : dto.otherCosts === null ? null : undefined,
        isPublished: typeof dto.isPublished === 'boolean' ? dto.isPublished : undefined,
        isClearance: typeof dto.isClearance === 'boolean' ? dto.isClearance : undefined,
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
