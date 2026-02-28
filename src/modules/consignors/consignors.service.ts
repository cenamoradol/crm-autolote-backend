import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsignorDto } from './dto/create-consignor.dto';
import { UpdateConsignorDto } from './dto/update-consignor.dto';

@Injectable()
export class ConsignorsService {
    constructor(private readonly prisma: PrismaService) { }

    async list(storeId: string, q: string) {
        return this.prisma.consignor.findMany({
            where: {
                storeId,
                OR: q ? [
                    { fullName: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                    { phone: { contains: q, mode: 'insensitive' } },
                    { dni: { contains: q, mode: 'insensitive' } },
                ] : undefined,
            },
            orderBy: { fullName: 'asc' },
        });
    }

    async get(storeId: string, id: string) {
        const consignor = await this.prisma.consignor.findFirst({
            where: { id, storeId },
            include: {
                vehicles: {
                    include: {
                        brand: { select: { name: true } },
                        model: { select: { name: true } },
                    }
                }
            },
        });
        if (!consignor) throw new BadRequestException('Consignatario no encontrado');
        return consignor;
    }

    async create(storeId: string, userId: string, dto: CreateConsignorDto) {
        return this.prisma.consignor.create({
            data: {
                ...dto,
                storeId,
                createdByUserId: userId,
            },
        });
    }

    async update(storeId: string, id: string, dto: UpdateConsignorDto) {
        const current = await this.prisma.consignor.findFirst({ where: { id, storeId } });
        if (!current) throw new BadRequestException('Consignatario no encontrado');

        return this.prisma.consignor.update({
            where: { id },
            data: dto,
        });
    }

    async remove(storeId: string, id: string) {
        const current = await this.prisma.consignor.findFirst({ where: { id, storeId } });
        if (!current) throw new BadRequestException('Consignatario no encontrado');

        // Check if has vehicles
        const vehiclesCount = await this.prisma.vehicle.count({ where: { consignorId: id } });
        if (vehiclesCount > 0) throw new BadRequestException('No se puede eliminar un consignatario con vehículos asociados');

        return this.prisma.consignor.delete({ where: { id } });
    }
}
