import { Injectable } from '@nestjs/common';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleTypesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateVehicleTypeDto) {
    const name = dto.name.trim();

    // Check if it exists (including soft deleted)
    const existing = await this.prisma.vehicleType.findFirst({
      where: { name }
    });

    if (existing) {
      if (existing.deletedAt) {
        // Restore
        return this.prisma.vehicleType.update({
          where: { id: existing.id },
          data: { deletedAt: null }
        });
      }
      return existing; // Or throw conflict, but restore fits better for soft delete flow
    }

    return this.prisma.vehicleType.create({
      data: { name },
    });
  }

  async findAll(storeId?: string) {
    const types = await this.prisma.vehicleType.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { vehicles: true }
        }
      }
    });

    if (!storeId) return types;

    // Filtered counts by store
    const counts = await this.prisma.vehicle.groupBy({
      by: ['vehicleTypeId'],
      where: { storeId },
      _count: { _all: true }
    });

    return types.map(t => {
      const found = counts.find(c => c.vehicleTypeId === t.id);
      return {
        ...t,
        _count: {
          vehicles: found?._count._all || 0
        }
      };
    });
  }

  findOne(id: string) {
    return this.prisma.vehicleType.findFirst({
      where: { id, deletedAt: null },
    });
  }

  update(id: string, dto: UpdateVehicleTypeDto) {
    const data: any = {};
    if (dto.name) data.name = dto.name.trim();

    return this.prisma.vehicleType.update({
      where: { id, deletedAt: null },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.vehicleType.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
