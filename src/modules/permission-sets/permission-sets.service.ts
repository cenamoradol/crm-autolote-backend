import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePermissionSetDto } from './dto/create-permission-set.dto';
import { UpdatePermissionSetDto } from './dto/update-permission-set.dto';

@Injectable()
export class PermissionSetsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreatePermissionSetDto) {
        return this.prisma.permissionSet.create({
            data: {
                name: dto.name,
                permissions: dto.permissions,
                storeId: dto.storeId,
            },
        });
    }

    async findAll(storeId: string) {
        return this.prisma.permissionSet.findMany({
            where: { storeId },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const set = await this.prisma.permissionSet.findUnique({
            where: { id },
        });
        if (!set) throw new NotFoundException('Conjunto de permisos no encontrado');
        return set;
    }

    async update(id: string, dto: UpdatePermissionSetDto) {
        await this.findOne(id);
        return this.prisma.permissionSet.update({
            where: { id },
            data: {
                name: dto.name,
                permissions: dto.permissions,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.permissionSet.delete({
            where: { id },
        });
    }
}
