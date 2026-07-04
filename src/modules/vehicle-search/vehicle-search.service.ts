import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface VehicleSearchParams {
  brand?: string;
  model?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
  vehicleTypeId?: string;
  status?: 'AVAILABLE' | 'RESERVED' | 'SOLD';
}

@Injectable()
export class VehicleSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(storeId: string, params: VehicleSearchParams): Promise<any[]> {
    const where: Prisma.VehicleWhereInput = {
      storeId,
      status: 'AVAILABLE',
      isPublished: true,
    };

    if (params.brand) {
      where.brand = {
        name: { contains: params.brand, mode: 'insensitive' },
      };
    }

    if (params.model) {
      where.model = {
        name: { contains: params.model, mode: 'insensitive' },
      };
    }

    if (params.year) {
      where.year = params.year;
    }

    if (params.minPrice) {
      where.price = { gte: params.minPrice };
    }

    if (params.maxPrice) {
      where.price = { ...((where.price as object) || {}), lte: params.maxPrice };
    }

    if (params.vehicleTypeId) {
      where.vehicleTypeId = params.vehicleTypeId;
    }

    if (params.status) {
      where.status = params.status;
    }

    return this.prisma.vehicle.findMany({
      where,
      include: {
        brand: true,
        model: true,
        media: {
          where: { isCover: true },
          take: 1,
        },
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getVehicleById(storeId: string, vehicleId: string): Promise<any | null> {
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

  async getFeaturedVehicles(storeId: string, limit: number = 5): Promise<any[]> {
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

  async getSimilarVehicles(storeId: string, vehicleId: string, limit: number = 3): Promise<any[]> {
    const vehicle = await this.getVehicleById(storeId, vehicleId);

    if (!vehicle) return [];

    return this.search(storeId, {
      brand: vehicle.brand?.name,
      model: vehicle.model?.name,
      year: vehicle.year ? vehicle.year - 1 : undefined,
    });
  }
}
