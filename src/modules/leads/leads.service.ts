import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LeadQueryDto } from './dto/lead-query.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { UpsertLeadPreferenceDto } from './dto/upsert-lead-preference.dto';
import { UpdateLeadPreferenceDto } from './dto/update-lead-preference.dto';
import { LeadStatus } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) { }

  private async getUserPermissions(userId: string, storeId: string): Promise<Set<string>> {
    const membership = await (this.prisma.userRole as any).findUnique({
      where: { userId_storeId: { userId, storeId } },
    });
    const perms = new Set<string>();
    const pObj = membership?.permissions as Record<string, string[]>;
    if (pObj) {
      for (const [mod, acts] of Object.entries(pObj)) {
        if (Array.isArray(acts)) {
          for (const act of acts) perms.add(`${mod}:${act}`);
        }
      }
    }
    return perms;
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
      where: { userId, storeId },
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

    const perms = await this.getUserPermissions(userId, storeId);
    if (perms.has('leads:read_all') || perms.has('leads:update_all')) return lead;

    // seller: solo asignados a él
    if (lead.assignedToUserId === userId) return lead;

    throw new ForbiddenException('LEAD_FORBIDDEN');
  }

  private async assertLeadWritable(storeId: string, userId: string, leadId: string) {
    return this.assertLeadReadable(storeId, userId, leadId);
  }

  async list(storeId: string, userId: string, query: LeadQueryDto) {
    const perms = await this.getUserPermissions(userId, storeId);

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
    if (!perms.has('leads:read_all')) where.assignedToUserId = userId;

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
    const perms = await this.getUserPermissions(userId, storeId);

    let assignedToUserId = dto.assignedToUserId ?? null;

    // seller: si no mandan asignación, se asigna a sí mismo
    if (!perms.has('leads:read_all') && !assignedToUserId) assignedToUserId = userId;

    // seller: no puede asignar a otros
    if (!perms.has('leads:read_all') && assignedToUserId && assignedToUserId !== userId) {
      throw new ForbiddenException('SELLER_CANNOT_ASSIGN_OTHERS');
    }

    if (assignedToUserId) await this.ensureSellerInStore(storeId, assignedToUserId);

    if (dto.customerId) await this.ensureCustomerInStore(storeId, dto.customerId);

    const lead = await this.prisma.lead.create({
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

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Lead creado: ${lead.fullName || 'Nuevo Lead'}`,
        leadId: lead.id,
        customerId: lead.customerId ?? undefined,
        createdByUserId: userId,
      } as any,
    });

    return lead;
  }

  async update(storeId: string, userId: string, id: string, dto: UpdateLeadDto) {
    const perms = await this.getUserPermissions(userId, storeId);

    const lead = await this.prisma.lead.findFirst({
      where: { id, storeId },
      select: { id: true, assignedToUserId: true, fullName: true },
    });
    if (!lead) throw new NotFoundException('LEAD_NOT_FOUND');

    if (!perms.has('leads:read_all') && !perms.has('leads:update_all')) {
      if (lead.assignedToUserId !== userId) throw new ForbiddenException('LEAD_FORBIDDEN');
      if (dto.assignedToUserId && dto.assignedToUserId !== userId) {
        throw new ForbiddenException('SELLER_CANNOT_REASSIGN');
      }
    }

    if ((perms.has('leads:read_all') || perms.has('leads:update_all')) && dto.assignedToUserId) {
      await this.ensureSellerInStore(storeId, dto.assignedToUserId);
    }

    if (dto.customerId) await this.ensureCustomerInStore(storeId, dto.customerId);

    const updated = await this.prisma.lead.update({
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

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Lead actualizado: ${updated.fullName || lead.fullName}`,
        leadId: updated.id,
        customerId: updated.customerId ?? undefined,
        createdByUserId: userId,
      } as any,
    });

    return updated;
  }

  async remove(storeId: string, userId: string, id: string) {
    const perms = await this.getUserPermissions(userId, storeId);
    if (!perms.has('leads:delete_all')) throw new ForbiddenException('SELLER_CANNOT_DELETE');

    const lead = await this.prisma.lead.findFirst({ where: { id, storeId }, select: { id: true, fullName: true } });
    if (!lead) throw new NotFoundException('LEAD_NOT_FOUND');

    await this.prisma.lead.delete({ where: { id } as any });

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Lead eliminado: ${lead.fullName} (ID: ${id})`,
        createdByUserId: userId,
      } as any,
    });

    return { ok: true };
  }

  async assign(storeId: string, userId: string, leadId: string, assignedToUserId: string) {
    const perms = await this.getUserPermissions(userId, storeId);
    if (!perms.has('leads:assign_all') && !perms.has('leads:update_all')) throw new ForbiddenException('SELLER_CANNOT_ASSIGN');

    await this.assertLeadWritable(storeId, userId, leadId);
    const assignee = await this.prisma.userRole.findFirst({ where: { userId: assignedToUserId, storeId }, include: { user: true } });
    if (!assignee) throw new ForbiddenException('ASSIGNEE_NOT_IN_STORE');

    const updated = await this.prisma.lead.update({
      where: { id: leadId } as any,
      data: { assignedToUserId } as any,
      include: { preference: true, customer: true, assignedTo: { select: { id: true, fullName: true, email: true } } },
    });

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Lead asignado a: ${updated.assignedTo?.fullName || updated.assignedTo?.email}`,
        leadId: updated.id,
        createdByUserId: userId, // The admin/supervisor who did the assignment
      } as any,
    });

    return updated;
  }

  async updateStatus(storeId: string, userId: string, leadId: string, status: string) {
    await this.assertLeadWritable(storeId, userId, leadId);

    const updated = await this.prisma.lead.update({
      where: { id: leadId } as any,
      data: { status } as any,
      include: { preference: true, customer: true, assignedTo: { select: { id: true, fullName: true, email: true } } },
    });

    await this.prisma.activity.create({
      data: {
        storeId,
        type: 'SYSTEM' as any,
        notes: `Estado de Lead cambiado a: ${status}`,
        leadId: updated.id,
        createdByUserId: userId,
      } as any,
    });

    return updated;
  }

  // -------- Preference --------

  async getPreference(storeId: string, userId: string, leadId: string) {
    await this.assertLeadReadable(storeId, userId, leadId);

    const pref = await this.prisma.leadPreference.findFirst({
      where: { storeId, leadId },
      include: { desiredBrand: true, desiredModel: true, vehicleType: true },
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
        vehicleTypeId: dto.vehicleTypeId ?? null,
        notes: dto.notes ?? null,
      } as any,
      update: {
        minPrice: dto.minPrice ?? undefined,
        maxPrice: dto.maxPrice ?? undefined,
        yearFrom: dto.yearFrom ?? undefined,
        yearTo: dto.yearTo ?? undefined,
        desiredBrandId: dto.desiredBrandId ?? undefined,
        desiredModelId: dto.desiredModelId ?? undefined,
        vehicleTypeId: dto.vehicleTypeId ?? undefined,
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
        vehicleTypeId: dto.vehicleTypeId ?? undefined,
        notes: dto.notes ?? undefined,
      } as any,
    });
  }

  async deletePreference(storeId: string, userId: string, leadId: string) {
    const perms = await this.getUserPermissions(userId, storeId);
    if (!perms.has('leads:delete_all')) throw new ForbiddenException('SELLER_CANNOT_DELETE_PREFERENCE');

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
