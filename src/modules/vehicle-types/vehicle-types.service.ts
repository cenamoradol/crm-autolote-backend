import { Injectable } from '@nestjs/common';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VehicleTypesService {
  constructor(private readonly prisma: PrismaService) { }

  create(dto: CreateVehicleTypeDto) {
    return this.prisma.vehicleType.create({
      data: { name: dto.name.trim() },
    });
  }

  findAll() {
    return this.prisma.vehicleType.findMany({
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.vehicleType.findUnique({
      where: { id },
    });
  }

  update(id: string, dto: UpdateVehicleTypeDto) {
    const data: any = {};
    if (dto.name) data.name = dto.name.trim();

    return this.prisma.vehicleType.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.vehicleType.delete({
      where: { id },
    });
  }
}
