import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface VehicleSearchParams {
  brand?: string;
  model?: string;
  year?: number;
  minYear?: number;
  maxYear?: number;
  minPrice?: number;
  maxPrice?: number;
  vehicleTypeId?: string;
  status?: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  limit?: number;
  offset?: number;
  onlyPublished?: boolean;
}

const VEHICLE_COVER_INCLUDE = {
  brand: true,
  model: true,
  media: { where: { isCover: true }, take: 1 },
  branch: true,
};

const VEHICLE_FULL_INCLUDE = {
  brand: true,
  model: true,
  vehicleType: true,
  colorRef: true,
  branch: { select: { id: true, name: true } },
  media: { orderBy: { position: 'asc' as const } },
};

@Injectable()
export class VehicleSearchService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(
    storeId: string,
    params: VehicleSearchParams,
  ): Prisma.VehicleWhereInput {
    const where: Prisma.VehicleWhereInput = {
      storeId,
      status: 'AVAILABLE',
    };

    if (params.onlyPublished !== false) {
      where.isPublished = true;
    }

    if (params.brand) {
      where.brand = { name: { contains: params.brand, mode: 'insensitive' } };
    }

    if (params.model) {
      where.model = { name: { contains: params.model, mode: 'insensitive' } };
    }

    if (params.year !== undefined) {
      where.year = params.year;
    } else if (params.minYear !== undefined || params.maxYear !== undefined) {
      const yearFilter: Prisma.IntNullableFilter = {};
      if (params.minYear !== undefined) yearFilter.gte = params.minYear;
      if (params.maxYear !== undefined) yearFilter.lte = params.maxYear;
      where.year = yearFilter;
    }

    if (params.minPrice) {
      where.price = { gte: params.minPrice };
    }

    if (params.maxPrice) {
      where.price = {
        ...((where.price as object) || {}),
        lte: params.maxPrice,
      };
    }

    if (params.vehicleTypeId) {
      where.vehicleTypeId = params.vehicleTypeId;
    }

    if (params.status) {
      where.status = params.status;
    }

    return where;
  }

  async search(storeId: string, params: VehicleSearchParams): Promise<any[]> {
    const where = this.buildWhere(storeId, params);

    return this.prisma.vehicle.findMany({
      where,
      include: VEHICLE_COVER_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: params.limit ?? 20,
      skip: params.offset ?? 0,
    });
  }

  async searchWithCount(
    storeId: string,
    params: VehicleSearchParams,
  ): Promise<{ results: any[]; total: number }> {
    const where = this.buildWhere(storeId, params);

    const [results, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        include: VEHICLE_FULL_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: params.limit ?? 20,
        skip: params.offset ?? 0,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return { results, total };
  }

  async getVehicleById(
    storeId: string,
    vehicleId: string,
  ): Promise<any | null> {
    return this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        storeId,
      },
      include: {
        brand: true,
        model: true,
        colorRef: true,
        media: {
          orderBy: { position: 'asc' },
        },
        branch: true,
        vehicleType: true,
      },
    });
  }

  async getFeaturedVehicles(
    storeId: string,
    limit: number = 5,
  ): Promise<any[]> {
    return this.prisma.vehicle.findMany({
      where: {
        storeId,
        status: 'AVAILABLE',
        isPublished: true,
      },
      include: {
        brand: true,
        model: true,
        media: {
          where: { isCover: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getVehiclesByBrand(storeId: string, brandName: string): Promise<any[]> {
    return this.search(storeId, { brand: brandName });
  }

  async getVehiclesByModel(storeId: string, modelName: string): Promise<any[]> {
    return this.search(storeId, { model: modelName });
  }

  async getSimilarVehicles(
    storeId: string,
    vehicleId: string,
    limit: number = 3,
  ): Promise<any[]> {
    const vehicle = await this.getVehicleById(storeId, vehicleId);

    if (!vehicle) return [];

    return this.search(storeId, {
      brand: vehicle.brand?.name,
      model: vehicle.model?.name,
      year: vehicle.year ? vehicle.year - 1 : undefined,
    });
  }
}
