import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- READ ----------
  async listBrands(q?: string) {
    const where = q
      ? { name: { contains: q.trim(), mode: 'insensitive' as const } }
      : undefined;

    return this.prisma.brand.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async listModelsByBrand(brandId: string, q?: string) {
    const where: any = { brandId };
    if (q) where.name = { contains: q.trim(), mode: 'insensitive' as const };

    return this.prisma.model.findMany({
      where,
      select: { id: true, name: true, brandId: true },
      orderBy: { name: 'asc' },
    });
  }

  async listModels(q?: string, brandId?: string) {
    const where: any = {};
    if (brandId) where.brandId = brandId;
    if (q) where.name = { contains: q.trim(), mode: 'insensitive' as const };

    return this.prisma.model.findMany({
      where,
      select: { id: true, name: true, brandId: true },
      orderBy: [{ brandId: 'asc' }, { name: 'asc' }],
    });
  }

  // ---------- BRAND CRUD ----------
  async createBrand(name: string) {
    const clean = normalizeName(name);

    try {
      return await this.prisma.brand.create({
        data: { name: clean },
        select: { id: true, name: true },
      });
    } catch (e: any) {
      // Unique constraint
      if (e?.code === 'P2002') {
        throw new ConflictException({ code: 'BRAND_DUPLICATE', message: 'La marca ya existe.' });
      }
      throw e;
    }
  }

  async updateBrand(id: string, name?: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id }, select: { id: true } });
    if (!brand) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Brand no existe.' });

    const data: any = {};
    if (typeof name === 'string') data.name = normalizeName(name);

    try {
      return await this.prisma.brand.update({
        where: { id },
        data,
        select: { id: true, name: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({ code: 'BRAND_DUPLICATE', message: 'La marca ya existe.' });
      }
      throw e;
    }
  }

  async deleteBrand(id: string) {
    const brand = await this.prisma.brand.findUnique({ where: { id }, select: { id: true } });
    if (!brand) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Brand no existe.' });

    // bloquear si está en uso
    const modelsCount = await this.prisma.model.count({ where: { brandId: id } });
    if (modelsCount > 0) {
      throw new BadRequestException({
        code: 'BRAND_IN_USE',
        message: 'No se puede eliminar: existen modelos asociados a esta marca.',
      });
    }

    const vehiclesCount = await this.prisma.vehicle.count({ where: { brandId: id } });
    if (vehiclesCount > 0) {
      throw new BadRequestException({
        code: 'BRAND_IN_USE',
        message: 'No se puede eliminar: existen vehículos usando esta marca.',
      });
    }

    await this.prisma.brand.delete({ where: { id } });
    return { ok: true };
  }

  // ---------- MODEL CRUD ----------
  async createModel(brandId: string, name: string) {
    const clean = normalizeName(name);

    const brand = await this.prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) throw new BadRequestException({ code: 'INVALID_BRAND', message: 'Brand inválido.' });

    try {
      return await this.prisma.model.create({
        data: { brandId, name: clean },
        select: { id: true, name: true, brandId: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({
          code: 'MODEL_DUPLICATE',
          message: 'Ya existe ese modelo para esa marca.',
        });
      }
      throw e;
    }
  }

  async updateModel(id: string, dto: { name?: string; brandId?: string }) {
    const model = await this.prisma.model.findUnique({ where: { id }, select: { id: true, brandId: true } });
    if (!model) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Model no existe.' });

    const data: any = {};
    if (typeof dto.name === 'string') data.name = normalizeName(dto.name);

    if (typeof dto.brandId === 'string') {
      const brand = await this.prisma.brand.findUnique({ where: { id: dto.brandId }, select: { id: true } });
      if (!brand) throw new BadRequestException({ code: 'INVALID_BRAND', message: 'Brand inválido.' });

      // Si lo querés mover de marca, bloquear si está en uso por vehículos
      const vehiclesCount = await this.prisma.vehicle.count({ where: { modelId: id } });
      if (vehiclesCount > 0 && dto.brandId !== model.brandId) {
        throw new BadRequestException({
          code: 'MODEL_IN_USE',
          message: 'No se puede cambiar de marca: hay vehículos usando este modelo.',
        });
      }

      data.brandId = dto.brandId;
    }

    try {
      return await this.prisma.model.update({
        where: { id },
        data,
        select: { id: true, name: true, brandId: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({
          code: 'MODEL_DUPLICATE',
          message: 'Ya existe ese modelo para esa marca.',
        });
      }
      throw e;
    }
  }

  async deleteModel(id: string) {
    const model = await this.prisma.model.findUnique({ where: { id }, select: { id: true } });
    if (!model) throw new BadRequestException({ code: 'NOT_FOUND', message: 'Model no existe.' });

    const vehiclesCount = await this.prisma.vehicle.count({ where: { modelId: id } });
    if (vehiclesCount > 0) {
      throw new BadRequestException({
        code: 'MODEL_IN_USE',
        message: 'No se puede eliminar: existen vehículos usando este modelo.',
      });
    }

    await this.prisma.model.delete({ where: { id } });
    return { ok: true };
  }
}
