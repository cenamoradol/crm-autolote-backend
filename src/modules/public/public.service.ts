import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) { }

  async listVehicles(storeSlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true, slug: true, logoUrl: true, currency: true, currencySymbol: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const vehicles = await this.prisma.vehicle.findMany({
      where: { storeId: store.id, isPublished: true, status: { not: 'ARCHIVED' } },
      select: {
        id: true,
        publicId: true,
        status: true,
        title: true,
        description: true,
        year: true,
        price: true,
        offerPrice: true,
        mileage: true,
        vin: true,
        plate: true,
        stockNumber: true,
        transmission: true,
        engineSize: true,
        fuelType: true,
        createdAt: true,
        updatedAt: true,
        brand: true,
        model: true,
        media: true,
        colorRef: true,
        vehicleType: true,
        branch: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { store, vehicles };
  }

  async listVehiclesById(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, slug: true, logoUrl: true, currency: true, currencySymbol: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const vehicles = await this.prisma.vehicle.findMany({
      where: { storeId: store.id, isPublished: true, status: { not: 'ARCHIVED' } },
      select: {
        id: true,
        publicId: true,
        status: true,
        title: true,
        description: true,
        year: true,
        price: true,
        offerPrice: true,
        mileage: true,
        vin: true,
        plate: true,
        stockNumber: true,
        transmission: true,
        engineSize: true,
        fuelType: true,
        createdAt: true,
        updatedAt: true,
        brand: true,
        model: true,
        media: true,
        colorRef: true,
        vehicleType: true,
        branch: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { store, vehicles };
  }

  async getVehicle(storeSlug: string, publicId: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true, slug: true, logoUrl: true, currency: true, currencySymbol: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { storeId: store.id, publicId, isPublished: true },
      select: {
        id: true,
        publicId: true,
        status: true,
        title: true,
        description: true,
        year: true,
        price: true,
        offerPrice: true,
        mileage: true,
        vin: true,
        plate: true,
        stockNumber: true,
        transmission: true,
        engineSize: true,
        fuelType: true,
        createdAt: true,
        updatedAt: true,
        brand: true,
        model: true,
        media: true,
        colorRef: true,
        vehicleType: true,
        branch: { select: { id: true, name: true, address: true } },
      },
    });

    if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
    return { store, vehicle };
  }

  async getVehicleById(storeId: string, publicId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, slug: true, logoUrl: true, currency: true, currencySymbol: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { storeId: store.id, publicId, isPublished: true },
      select: {
        id: true,
        publicId: true,
        status: true,
        title: true,
        description: true,
        year: true,
        price: true,
        offerPrice: true,
        mileage: true,
        vin: true,
        plate: true,
        stockNumber: true,
        transmission: true,
        engineSize: true,
        fuelType: true,
        createdAt: true,
        updatedAt: true,
        brand: true,
        model: true,
        media: true,
        colorRef: true,
        vehicleType: true,
        branch: { select: { id: true, name: true, address: true } },
      },
    });

    if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
    return { store, vehicle };
  }
}
