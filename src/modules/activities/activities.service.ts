import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';


@Injectable()
export class ActivitiesService {
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

  private parseDateOrThrow(value: string) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new ForbiddenException('INVALID_DATE');
    return d;
  }

  private async ensureCustomerInStore(customerId: string, storeId: string) {
    const exists = await this.prisma.customer.findFirst({
      where: { id: customerId, storeId },
      select: { id: true },
    });
    if (!exists) throw new ForbiddenException('CUSTOMER_NOT_IN_STORE');
  }

  private async ensureVehicleInStore(vehicleId: string, storeId: string) {
    const exists = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, storeId },
      select: { id: true },
    });
    if (!exists) throw new ForbiddenException('VEHICLE_NOT_IN_STORE');
  }

  private async ensureLeadInStore(leadId: string, storeId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, storeId },
      select: { id: true, assignedToUserId: true },
    });
    if (!lead) throw new ForbiddenException('LEAD_NOT_IN_STORE');
    return lead;
  }

  private async assertActivityReadable(storeId: string, userId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, storeId },
      select: { id: true, leadId: true, createdByUserId: true },
    });
    if (!activity) throw new NotFoundException('ACTIVITY_NOT_FOUND');

    const perms = await this.getUserPermissions(userId, storeId);
    if (perms.has('activities:read_all') || perms.has('activities:update_all')) return activity;

    // seller: puede leer si la creó o si está ligada a un lead asignado a él
    if (activity.createdByUserId === userId) return activity;

    if (activity.leadId) {
      const lead = await this.prisma.lead.findFirst({
        where: { id: activity.leadId, storeId },
        select: { assignedToUserId: true },
      });
      if (lead?.assignedToUserId === userId) return activity;
    }

    throw new ForbiddenException('ACTIVITY_FORBIDDEN');
  }

  private async assertActivityWritable(storeId: string, userId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, storeId },
      select: { id: true, createdByUserId: true },
    });
    if (!activity) throw new NotFoundException('ACTIVITY_NOT_FOUND');

    const perms = await this.getUserPermissions(userId, storeId);
    if (perms.has('activities:update_all')) return activity;

    // seller: solo si la creó
    if (activity.createdByUserId === userId) return activity;

    throw new ForbiddenException('ACTIVITY_FORBIDDEN');
  }

  async list(storeId: string, userId: string, query: ActivityQueryDto) {
    const perms = await this.getUserPermissions(userId, storeId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { storeId };

    if (query.type) where.type = query.type;
    if (query.leadId) where.leadId = query.leadId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.vehicleId) where.vehicleId = query.vehicleId;

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.notes = { contains: q, mode: 'insensitive' };
    }

    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) where.createdAt.gte = this.parseDateOrThrow(query.createdFrom);
      if (query.createdTo) where.createdAt.lte = this.parseDateOrThrow(query.createdTo);
    }

    // if not read_all: solo actividades propias o vinculadas a leads asignados a él
    if (!perms.has('activities:read_all')) {
      where.OR = [
        { createdByUserId: userId },
        { lead: { assignedToUserId: userId } },
      ];
    }

    const orderBy: any = { createdAt: query.sortDir ?? 'desc' };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.activity.count({ where }),
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          lead: true,
          customer: true,
          vehicle: {
            include: {
              brand: true,
              model: true,
              branch: true,
            },
          },
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(storeId: string, userId: string, id: string) {
    await this.assertActivityReadable(storeId, userId, id);

    const activity = await this.prisma.activity.findFirst({
      where: { id, storeId },
      include: {
        lead: true,
        customer: true,
        vehicle: { include: { brand: true, model: true, branch: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!activity) throw new NotFoundException('ACTIVITY_NOT_FOUND');
    return activity;
  }

  async create(storeId: string, userId: string, dto: CreateActivityDto) {
    const perms = await this.getUserPermissions(userId, storeId);

    if (dto.customerId) await this.ensureCustomerInStore(dto.customerId, storeId);
    if (dto.vehicleId) await this.ensureVehicleInStore(dto.vehicleId, storeId);

    if (dto.leadId) {
      const lead = await this.ensureLeadInStore(dto.leadId, storeId);
      if (!perms.has('activities:read_all') && lead.assignedToUserId !== userId) {
        throw new ForbiddenException('LEAD_FORBIDDEN');
      }
    }

    if (!dto.leadId && !dto.customerId && !dto.vehicleId) {
      throw new ForbiddenException('ACTIVITY_REQUIRES_ENTITY');
    }

    return this.prisma.activity.create({
      data: {
        storeId,
        type: dto.type as any,
        notes: dto.notes ?? null,
        leadId: dto.leadId ?? null,
        customerId: dto.customerId ?? null,
        vehicleId: dto.vehicleId ?? null,
        createdByUserId: userId,
      } as any,
      include: {
        lead: true,
        customer: true,
        vehicle: { include: { brand: true, model: true, branch: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async update(storeId: string, userId: string, id: string, dto: UpdateActivityDto) {
    const perms = await this.getUserPermissions(userId, storeId);

    await this.assertActivityWritable(storeId, userId, id);

    if (dto.customerId) await this.ensureCustomerInStore(dto.customerId, storeId);
    if (dto.vehicleId) await this.ensureVehicleInStore(dto.vehicleId, storeId);

    if (dto.leadId) {
      const lead = await this.ensureLeadInStore(dto.leadId, storeId);
      if (!perms.has('activities:read_all') && lead.assignedToUserId !== userId) {
        throw new ForbiddenException('LEAD_FORBIDDEN');
      }
    }

    const existing = await this.prisma.activity.findFirst({
      where: { id, storeId },
      select: { leadId: true, customerId: true, vehicleId: true },
    });
    if (!existing) throw new NotFoundException('ACTIVITY_NOT_FOUND');

    const nextLeadId = dto.leadId !== undefined ? dto.leadId : existing.leadId;
    const nextCustomerId = dto.customerId !== undefined ? dto.customerId : existing.customerId;
    const nextVehicleId = dto.vehicleId !== undefined ? dto.vehicleId : existing.vehicleId;

    if (!nextLeadId && !nextCustomerId && !nextVehicleId) {
      throw new ForbiddenException('ACTIVITY_REQUIRES_ENTITY');
    }

    return this.prisma.activity.update({
      where: { id } as any,
      data: {
        type: dto.type ?? undefined,
        notes: dto.notes ?? undefined,
        leadId: dto.leadId ?? undefined,
        customerId: dto.customerId ?? undefined,
        vehicleId: dto.vehicleId ?? undefined,
      } as any,
      include: {
        lead: true,
        customer: true,
        vehicle: { include: { brand: true, model: true, branch: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async remove(storeId: string, userId: string, id: string) {
    await this.assertActivityWritable(storeId, userId, id);

    await this.prisma.activity.delete({ where: { id } as any });
    return { ok: true };
  }
}
