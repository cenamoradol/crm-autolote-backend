import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VehicleSearchService } from '../vehicle-search/vehicle-search.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehicleSearch: VehicleSearchService,
  ) {}

  async listVehicles(storeSlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        currency: true,
        currencySymbol: true,
      },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const now = new Date();
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        storeId: store.id,
        isPublished: true,
        isClearance: false,
        status: { not: 'ARCHIVED' },
        OR: [{ maxPublishDate: null }, { maxPublishDate: { gt: now } }],
      },
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
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        currency: true,
        currencySymbol: true,
      },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const now = new Date();
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        storeId: store.id,
        isPublished: true,
        isClearance: false,
        status: { not: 'ARCHIVED' },
        OR: [{ maxPublishDate: null }, { maxPublishDate: { gt: now } }],
      },
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

  async searchVehiclesByStoreId(
    storeId: string,
    params: {
      brand?: string;
      model?: string;
      year?: number;
      minYear?: number;
      maxYear?: number;
      limit?: number;
      offset?: number;
    },
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const { results, total } = await this.vehicleSearch.searchWithCount(
      storeId,
      params,
    );

    return {
      results,
      total,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };
  }

  async listClearanceVehiclesById(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        currency: true,
        currencySymbol: true,
      },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const now = new Date();
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        storeId: store.id,
        isPublished: true,
        isClearance: true,
        status: { not: 'ARCHIVED' },
        OR: [{ maxPublishDate: null }, { maxPublishDate: { gt: now } }],
      },
      select: {
        id: true,
        publicId: true,
        status: true,
        title: true,
        description: true,
        year: true,
        price: true,
        offerPrice: true,
        clearancePrice: true,
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
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        currency: true,
        currencySymbol: true,
      },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const now = new Date();
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        storeId: store.id,
        publicId,
        isPublished: true,
        OR: [{ maxPublishDate: null }, { maxPublishDate: { gt: now } }],
      },
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
        isClearance: true,
        branch: { select: { id: true, name: true, address: true } },
      },
    });

    if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
    return { store, vehicle };
  }

  async getVehicleById(storeId: string, publicId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        currency: true,
        currencySymbol: true,
      },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const now = new Date();
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        storeId: store.id,
        publicId,
        isPublished: true,
        OR: [{ maxPublishDate: null }, { maxPublishDate: { gt: now } }],
      },
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
        isClearance: true,
        branch: { select: { id: true, name: true, address: true } },
      },
    });

    if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
    return { store, vehicle };
  }

  // ─── Servicios (Public) ────────────────────────────────────

  async listServiceCategoriesById(storeId: string) {
    const categories = await this.prisma.serviceCategory.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });
    return categories;
  }

  async listServicesById(storeId: string, categorySlug?: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        currency: true,
        currencySymbol: true,
      },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const services = await this.prisma.serviceListing.findMany({
      where: {
        storeId: store.id,
        isPublished: true,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      include: {
        media: { orderBy: { position: 'asc' } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { store, services };
  }

  // ─── Events ────────────────────────────────────────────────

  async listEventCategories(storeSlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const categories = await this.prisma.eventCategory.findMany({
      where: { storeId: store.id, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        position: true,
        _count: { select: { events: { where: { isPublished: true } } } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    return { store, categories };
  }

  async listCategoryEvents(storeSlug: string, categorySlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const category = await this.prisma.eventCategory.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: categorySlug } },
      select: { id: true, name: true, slug: true, description: true },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada.');

    const events = await this.prisma.event.findMany({
      where: { storeId: store.id, categoryId: category.id, isPublished: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        date: true,
        createdAt: true,
        _count: { select: { media: true, vehicles: true } },
        media: { where: { isCover: true }, take: 1 },
      },
      orderBy: [{ position: 'asc' }, { date: 'desc' }, { createdAt: 'desc' }],
    });

    return { store, category, events };
  }

  async listCategoryEventsById(storeId: string, categorySlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        currency: true,
        currencySymbol: true,
      },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const category = await this.prisma.eventCategory.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: categorySlug } },
      select: { id: true, name: true, slug: true, description: true },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada.');

    // Custom deep selection corresponding to Website requirements (showing events, full gallery and nested vehicles)
    const events = await this.prisma.event.findMany({
      where: { storeId: store.id, categoryId: category.id, isPublished: true },
      include: {
        media: {
          orderBy: [{ isCover: 'desc' }, { position: 'asc' }],
        },
        vehicles: {
          orderBy: { position: 'asc' },
          include: {
            vehicle: {
              select: {
                id: true,
                publicId: true,
                title: true,
                year: true,
                price: true,
                offerPrice: true,
                mileage: true,
                transmission: true,
                fuelType: true,
                status: true,
                brand: true,
                model: true,
                colorRef: true,
                vehicleType: true,
                media: { where: { isCover: true }, take: 1 },
              },
            },
          },
        },
      },
      // Order by latest event date descending
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return { store, category, events };
  }

  async getEvent(storeSlug: string, eventSlug: string) {
    const store = await this.prisma.store.findUnique({
      where: { slug: storeSlug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        currency: true,
        currencySymbol: true,
      },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const event = await this.prisma.event.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: eventSlug } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        media: { orderBy: { position: 'asc' } },
        vehicles: {
          orderBy: { position: 'asc' },
          include: {
            vehicle: {
              select: {
                id: true,
                publicId: true,
                title: true,
                year: true,
                price: true,
                offerPrice: true,
                mileage: true,
                transmission: true,
                fuelType: true,
                status: true,
                brand: true,
                model: true,
                colorRef: true,
                vehicleType: true,
                media: { where: { isCover: true }, take: 1 },
              },
            },
          },
        },
      },
    });

    if (!event || !event.isPublished)
      throw new NotFoundException('Evento no encontrado.');
    return { store, event };
  }

  // ─── Advertisements ─────────────────────────────────────────

  async listAdvertisementsById(storeId: string) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, slug: true },
    });
    if (!store) throw new NotFoundException('Store no existe.');

    const advertisements = await this.prisma.advertisement.findMany({
      where: { storeId: store.id, isActive: true },
      select: {
        id: true,
        title: true,
        kind: true,
        imageUrl: true,
        targetUrl: true,
        placement: true,
        weight: true,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    return { store, advertisements };
  }

  async trackImpression(adId: string) {
    return this.prisma.advertisement.update({
      where: { id: adId },
      data: { impressions: { increment: 1 } },
    });
  }

  async trackClick(adId: string) {
    return this.prisma.advertisement.update({
      where: { id: adId },
      data: { clicks: { increment: 1 } },
    });
  }

  async trackWhatsappClick(adId: string) {
    return this.prisma.advertisement.update({
      where: { id: adId },
      data: { whatsappClicks: { increment: 1 } },
    });
  }

  async trackShareClick(adId: string) {
    return this.prisma.advertisement.update({
      where: { id: adId },
      data: { shareClicks: { increment: 1 } },
    });
  }

  // ─── Service Clicks Tracking ─────────────────────────────────────────

  async trackServiceWhatsappClick(storeId: string, serviceId: string) {
    return this.prisma.serviceListing.updateMany({
      where: { storeId, id: serviceId },
      data: { whatsappClicks: { increment: 1 } },
    });
  }

  async trackServiceShareClick(storeId: string, serviceId: string) {
    return this.prisma.serviceListing.updateMany({
      where: { storeId, id: serviceId },
      data: { shareClicks: { increment: 1 } },
    });
  }
}
