import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });
  }

  async getById(storeId: string, id: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, storeId },
    });
    if (!category) throw new BadRequestException('Categoría no existe.');
    return category;
  }

  async create(storeId: string, name: string) {
    const slug = this.slugify(name);
    
    // Check for duplicate slug in same store
    const existing = await this.prisma.serviceCategory.findUnique({
      where: { storeId_slug: { storeId, slug } },
    });
    if (existing) throw new BadRequestException('Ya existe una categoría con nombre similar.');

    return this.prisma.serviceCategory.create({
      data: { storeId, name, slug },
    });
  }

  async update(storeId: string, id: string, name: string) {
    const current = await this.getById(storeId, id);
    const slug = this.slugify(name);

    if (current.slug !== slug) {
      const existing = await this.prisma.serviceCategory.findUnique({
        where: { storeId_slug: { storeId, slug } },
      });
      if (existing) throw new BadRequestException('Ya existe otra categoría con nombre similar.');
    }

    return this.prisma.serviceCategory.update({
      where: { id },
      data: { name, slug },
    });
  }

  async delete(storeId: string, id: string) {
    await this.getById(storeId, id);

    // Check if there are services using this category
    const count = await this.prisma.serviceListing.count({
      where: { categoryId: id },
    });
    if (count > 0) {
      throw new BadRequestException('No se puede eliminar la categoría porque tiene servicios asociados.');
    }

    await this.prisma.serviceCategory.delete({ where: { id } });
    return { ok: true };
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }
}
