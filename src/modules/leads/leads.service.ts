import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadQueryDto } from './dto/lead-query.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpsertLeadPreferenceDto } from './dto/upsert-lead-preference.dto';
import { UpdateLeadPreferenceDto } from './dto/update-lead-preference.dto';
import { LeadStatus, RoleKey } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private roleRank(key: RoleKey) {
    if (key === 'admin') return 3;
    if (key === 'supervisor') return 2;
    return 1;
  }

  private async getHighestRoleInStore(userId: string, storeId: string): Promise<RoleKey> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId, storeId },
      include: { role: { select: { key: true } } },
    });

    if (!rows.length) throw new ForbiddenException('STORE_ACCESS_DENIED');

    let best: RoleKey = 'seller';
    for (const r of rows) {
      const key = r.role.key;
      if (this.roleRank(key) > this.roleRank(best)) best = key;
    }
    return best;
  }

  private async ensureCustomerInStore(storeId: string, customerId: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id: customerId, storeId },
      select: { id: true },
    });
    if (!c) throw new ForbiddenException('CUSTOMER_NOT_IN_STORE');
  }

  private async ensureSellerInStore(storeId: string, userId: string) {
    const row = await this.prisma.userRole.findFirst({
      where: { userId, storeId, role: { key: 'seller' } },
      select: { id: true },
    });
    if (!row) throw new ForbiddenException('ASSIGNEE_NOT_SELLER_IN_STORE');
  }

  private async assertLeadReadable(storeId: string, userId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, storeId },
      select: { id: true, assignedToUserId: true },
    });
    if (!lead) throw new NotFoundException('LEAD_NOT_FOUND');

    const role = await this.getHighestRoleInStore(userId, storeId);
    if (role === 'admin' || role === 'supervisor') return lead;

    // seller: solo asignados a él
    if (lead.assignedToUserId === userId) return lead;

    throw new ForbiddenException('LEAD_FORBIDDEN');
  }

  private async assertLeadWritable(storeId: string, userId: string, leadId: string) {
    return this.assertLeadReadable(storeId, userId, leadId);
  }

  async list(storeId: string, userId: string, query: LeadQueryDto) {
    const role = await this.getHighestRoleInStore(userId, storeId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { storeId };

    if (query.status) where.status = query.status;
    if (query.assignedToUserId) where.assignedToUserId = query.assignedToUserId;
    if (query.customerId) where.customerId = query.customerId;

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { source: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) where.createdAt.gte = new Date(query.createdFrom);
      if (query.createdTo) where.createdAt.lte = new Date(query.createdTo);
    }

    // seller: fuerza solo sus leads
    if (role === 'seller') where.assignedToUserId = userId;

    const orderBy: any = { [query.sortBy ?? 'createdAt']: query.sortDir ?? 'desc' };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          preference: true,
          customer: true,
          assignedTo: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(storeId: string, userId: string, id: string) {
    await this.assertLeadReadable(storeId, userId, id);

    const lead = await this.prisma.lead.findFirst({
      where: { id, storeId },
      include: {
        preference: true,
        customer: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!lead) throw new NotFoundException('LEAD_NOT_FOUND');
    return lead;
  }

  async create(storeId: string, userId: string, dto: CreateLeadDto) {
    const role = await this.getHighestRoleInStore(userId, storeId);

    let assignedToUserId = dto.assignedToUserId ?? null;

    // seller: si no mandan asignación, se asigna a sí mismo
    if (role === 'seller' && !assignedToUserId) assignedToUserId = userId;

    // seller: no puede asignar a otros
    if (role === 'seller' && assignedToUserId && assignedToUserId !== userId) {
      throw new ForbiddenException('SELLER_CANNOT_ASSIGN_OTHERS');
    }

    if (assignedToUserId) await this.ensureSellerInStore(storeId, assignedToUserId);

    if (dto.customerId) await this.ensureCustomerInStore(storeId, dto.customerId);

    return this.prisma.lead.create({
      data: {
        storeId,
        status: (dto.status as LeadStatus) ?? LeadStatus.NEW,
        source: dto.source ?? null,
        fullName: dto.fullName ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        assignedToUserId,
        customerId: dto.customerId ?? null,
      } as any,
      include: {
        preference: true,
        customer: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async update(storeId: string, userId: string, id: string, dto: UpdateLeadDto) {
    const role = await this.getHighestRoleInStore(userId, storeId);

    const lead = await this.prisma.lead.findFirst({
      where: { id, storeId },
      select: { id: true, assignedToUserId: true },
    });
    if (!lead) throw new NotFoundException('LEAD_NOT_FOUND');

    if (role === 'seller') {
      if (lead.assignedToUserId !== userId) throw new ForbiddenException('LEAD_FORBIDDEN');
      if (dto.assignedToUserId && dto.assignedToUserId !== userId) {
        throw new ForbiddenException('SELLER_CANNOT_REASSIGN');
      }
    }

    if ((role === 'admin' || role === 'supervisor') && dto.assignedToUserId) {
      await this.ensureSellerInStore(storeId, dto.assignedToUserId);
    }

    if (dto.customerId) await this.ensureCustomerInStore(storeId, dto.customerId);

    return this.prisma.lead.update({
      where: { id } as any,
      data: {
        status: dto.status ?? undefined,
        source: dto.source ?? undefined,
        fullName: dto.fullName ?? undefined,
        phone: dto.phone ?? undefined,
        email: dto.email ?? undefined,
        customerId: dto.customerId ?? undefined,
        assignedToUserId: dto.assignedToUserId ?? undefined,
      } as any,
      include: {
        preference: true,
        customer: true,
        assignedTo: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(storeId: string, userId: string, id: string) {
    const role = await this.getHighestRoleInStore(userId, storeId);
    if (role === 'seller') throw new ForbiddenException('SELLER_CANNOT_DELETE');

    const lead = await this.prisma.lead.findFirst({ where: { id, storeId }, select: { id: true } });
    if (!lead) throw new NotFoundException('LEAD_NOT_FOUND');

    await this.prisma.lead.delete({ where: { id } as any });
    return { ok: true };
  }

  async assign(storeId: string, userId: string, leadId: string, assignedToUserId: string) {
    const role = await this.getHighestRoleInStore(userId, storeId);
    if (role === 'seller') throw new ForbiddenException('SELLER_CANNOT_ASSIGN');

    await this.assertLeadWritable(storeId, userId, leadId);
    await this.ensureSellerInStore(storeId, assignedToUserId);

    return this.prisma.lead.update({
      where: { id: leadId } as any,
      data: { assignedToUserId } as any,
      include: { preference: true, customer: true, assignedTo: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async updateStatus(storeId: string, userId: string, leadId: string, status: string) {
    await this.assertLeadWritable(storeId, userId, leadId);

    return this.prisma.lead.update({
      where: { id: leadId } as any,
      data: { status } as any,
      include: { preference: true, customer: true, assignedTo: { select: { id: true, fullName: true, email: true } } },
    });
  }

  // -------- Preference --------

  async getPreference(storeId: string, userId: string, leadId: string) {
    await this.assertLeadReadable(storeId, userId, leadId);

    const pref = await this.prisma.leadPreference.findFirst({
      where: { storeId, leadId },
      include: { desiredBrand: true, desiredModel: true },
    });

    if (!pref) throw new NotFoundException('LEAD_PREFERENCE_NOT_FOUND');
    return pref;
  }

  async upsertPreference(storeId: string, userId: string, leadId: string, dto: UpsertLeadPreferenceDto) {
    await this.assertLeadWritable(storeId, userId, leadId);

    return this.prisma.leadPreference.upsert({
      where: { leadId } as any,
      create: {
        storeId,
        leadId,
        minPrice: dto.minPrice ?? null,
        maxPrice: dto.maxPrice ?? null,
        yearFrom: dto.yearFrom ?? null,
        yearTo: dto.yearTo ?? null,
        desiredBrandId: dto.desiredBrandId ?? null,
        desiredModelId: dto.desiredModelId ?? null,
        notes: dto.notes ?? null,
      } as any,
      update: {
        minPrice: dto.minPrice ?? undefined,
        maxPrice: dto.maxPrice ?? undefined,
        yearFrom: dto.yearFrom ?? undefined,
        yearTo: dto.yearTo ?? undefined,
        desiredBrandId: dto.desiredBrandId ?? undefined,
        desiredModelId: dto.desiredModelId ?? undefined,
        notes: dto.notes ?? undefined,
      } as any,
    });
  }

  async updatePreference(storeId: string, userId: string, leadId: string, dto: UpdateLeadPreferenceDto) {
    await this.assertLeadWritable(storeId, userId, leadId);

    const existing = await this.prisma.leadPreference.findFirst({
      where: { storeId, leadId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('LEAD_PREFERENCE_NOT_FOUND');

    return this.prisma.leadPreference.update({
      where: { id: existing.id } as any,
      data: {
        minPrice: dto.minPrice ?? undefined,
        maxPrice: dto.maxPrice ?? undefined,
        yearFrom: dto.yearFrom ?? undefined,
        yearTo: dto.yearTo ?? undefined,
        desiredBrandId: dto.desiredBrandId ?? undefined,
        desiredModelId: dto.desiredModelId ?? undefined,
        notes: dto.notes ?? undefined,
      } as any,
    });
  }

  async deletePreference(storeId: string, userId: string, leadId: string) {
    const role = await this.getHighestRoleInStore(userId, storeId);
    if (role === 'seller') throw new ForbiddenException('SELLER_CANNOT_DELETE_PREFERENCE');

    await this.assertLeadWritable(storeId, userId, leadId);

    const existing = await this.prisma.leadPreference.findFirst({
      where: { storeId, leadId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('LEAD_PREFERENCE_NOT_FOUND');

    await this.prisma.leadPreference.delete({ where: { id: existing.id } as any });
    return { ok: true };
  }
}
