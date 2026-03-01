import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ColorsService {
    constructor(private readonly prisma: PrismaService) { }

    async list(q?: string) {
        const where = q ? { name: { contains: q, mode: 'insensitive' as any } } : {};
        return this.prisma.color.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    }

    async create(name: string) {
        const trimmed = name.trim();
        if (!trimmed) throw new BadRequestException({ code: 'INVALID_NAME', message: 'El nombre no puede estar vacío.' });

        const exists = await this.prisma.color.findFirst({
            where: { name: { equals: trimmed, mode: 'insensitive' } },
        });
        if (exists) throw new BadRequestException({ code: 'DUPLICATE', message: 'Ya existe un color con este nombre.' });

        return this.prisma.color.create({
            data: { name: trimmed },
        });
    }

    async update(id: string, name: string) {
        const trimmed = name.trim();
        if (!trimmed) throw new BadRequestException({ code: 'INVALID_NAME', message: 'El nombre no puede estar vacío.' });

        const current = await this.prisma.color.findUnique({ where: { id } });
        if (!current) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Color no encontrado.' });

        const exists = await this.prisma.color.findFirst({
            where: { name: { equals: trimmed, mode: 'insensitive' }, NOT: { id } },
        });
        if (exists) throw new BadRequestException({ code: 'DUPLICATE', message: 'Ya existe otro color con este nombre.' });

        return this.prisma.color.update({
            where: { id },
            data: { name: trimmed },
        });
    }

    async remove(id: string) {
        const current = await this.prisma.color.findUnique({
            where: { id },
            include: { _count: { select: { vehicles: true } } },
        });
        if (!current) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Color no encontrado.' });

        if (current._count.vehicles > 0) {
            throw new BadRequestException({
                code: 'IN_USE',
                message: 'No puedes eliminar un color que está asignado a vehículos.',
            });
        }

        await this.prisma.color.delete({ where: { id } });
        return { success: true };
    }
}
