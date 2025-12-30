import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async listVehicles(storeSlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const vehicles = await this.prisma.vehicle.findMany({
      where: { storeId: store.id, isPublished: true, status: { not: 'ARCHIVED' } },
      include: { brand: true, model: true, media: true },
      orderBy: { createdAt: 'desc' },
    });

    return { store, vehicles };
  }

  async getVehicle(storeSlug: string, publicId: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { storeId: store.id, publicId, isPublished: true },
      include: { brand: true, model: true, media: true, branch: true },
    });

    if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
    return { store, vehicle };
  }
}
