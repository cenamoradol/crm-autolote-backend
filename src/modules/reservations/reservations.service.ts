import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VehicleStatus } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureVehicleInStore(storeId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, storeId },
      select: { id: true, status: true },
    });

    if (!vehicle) throw new ForbiddenException('VEHICLE_NOT_IN_STORE');
    return vehicle;
  }

  private async ensureCustomerInStore(storeId: string, customerId: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id: customerId, storeId },
      select: { id: true },
    });
    if (!c) throw new ForbiddenException('CUSTOMER_NOT_IN_STORE');
  }

  private async ensureLeadInStore(storeId: string, leadId: string) {
    const l = await this.prisma.lead.findFirst({
      where: { id: leadId, storeId },
      select: { id: true },
    });
    if (!l) throw new ForbiddenException('LEAD_NOT_IN_STORE');
  }

  private isExpired(expiresAt?: Date | null) {
    if (!expiresAt) return false;
    return expiresAt.getTime() <= Date.now();
  }

  /**
   * ✅ Limpieza automática: si la reserva está expirada, la eliminamos
   * y regresamos el vehículo a AVAILABLE (si aplica).
   */
  private async cleanupIfExpired(storeId: string, vehicleId: string, actorUserId: string) {
    const reservation = await this.prisma.vehicleReservation.findFirst({
      where: { storeId, vehicleId },
      select: { id: true, expiresAt: true },
    });

    if (!reservation) return { cleaned: false };

    if (!this.isExpired(reservation.expiresAt)) return { cleaned: false };

    await this.prisma.$transaction(async (tx) => {
      await tx.vehicleReservation.delete({ where: { id: reservation.id } });

      const vehicle = await tx.vehicle.findFirst({
        where: { id: vehicleId, storeId },
        select: { status: true },
      });

      // Solo revertimos si estaba RESERVED
      if (vehicle?.status === VehicleStatus.RESERVED) {
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });

        await tx.vehicleStatusHistory.create({
          data: {
            vehicleId,
            fromStatus: VehicleStatus.RESERVED,
            toStatus: VehicleStatus.AVAILABLE,
            changedByUserId: actorUserId,
          } as any,
        });
      }
    });

    return { cleaned: true };
  }

  async get(storeId: string, userId: string, vehicleId: string) {
    await this.ensureVehicleInStore(storeId, vehicleId);

    // ✅ Si está expirada, la limpia
    await this.cleanupIfExpired(storeId, vehicleId, userId);

    const reservation = await this.prisma.vehicleReservation.findFirst({
      where: { storeId, vehicleId },
      include: {
        reservedBy: { select: { id: true, fullName: true, email: true } },
        customer: true,
        lead: true,
      },
    });

    return { reservation: reservation ?? null };
  }

  async reserve(storeId: string, userId: string, vehicleId: string, dto: CreateReservationDto) {
    const vehicle = await this.ensureVehicleInStore(storeId, vehicleId);

    if (vehicle.status === VehicleStatus.SOLD) throw new ForbiddenException('VEHICLE_ALREADY_SOLD');
    if (vehicle.status === VehicleStatus.ARCHIVED) throw new ForbiddenException('VEHICLE_ARCHIVED');

    if (dto.customerId) await this.ensureCustomerInStore(storeId, dto.customerId);
    if (dto.leadId) await this.ensureLeadInStore(storeId, dto.leadId);

    // ✅ Si había reserva expirada, la liberamos para no bloquear
    await this.cleanupIfExpired(storeId, vehicleId, userId);

    // Validar que no exista reserva activa
    const existing = await this.prisma.vehicleReservation.findFirst({
      where: { storeId, vehicleId },
      select: { id: true },
    });
    if (existing) throw new ForbiddenException('VEHICLE_ALREADY_RESERVED');

    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    return this.prisma.$transaction(async (tx) => {
      // Crear reserva
      const reservation = await tx.vehicleReservation.create({
        data: {
          storeId,
          vehicleId,
          reservedByUserId: userId,
          customerId: dto.customerId ?? null,
          leadId: dto.leadId ?? null,
          expiresAt,
          notes: dto.notes ?? null,
        },
        include: {
          reservedBy: { select: { id: true, fullName: true, email: true } },
          customer: true,
          lead: true,
        },
      });

      // Cambiar status del vehículo a RESERVED (si no lo está)
      const current = await tx.vehicle.findFirst({
        where: { id: vehicleId, storeId },
        select: { status: true },
      });

      if (current?.status !== VehicleStatus.RESERVED) {
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { status: VehicleStatus.RESERVED },
        });

        await tx.vehicleStatusHistory.create({
          data: {
            vehicleId,
            fromStatus: current?.status ?? VehicleStatus.AVAILABLE,
            toStatus: VehicleStatus.RESERVED,
            changedByUserId: userId,
          } as any,
        });
      }

      return { reservation };
    });
  }

  async update(storeId: string, userId: string, vehicleId: string, dto: UpdateReservationDto) {
    await this.ensureVehicleInStore(storeId, vehicleId);

    // Limpia si expirada
    await this.cleanupIfExpired(storeId, vehicleId, userId);

    const existing = await this.prisma.vehicleReservation.findFirst({
      where: { storeId, vehicleId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('RESERVATION_NOT_FOUND');

    if (dto.customerId && dto.customerId !== null) await this.ensureCustomerInStore(storeId, dto.customerId);
    if (dto.leadId && dto.leadId !== null) await this.ensureLeadInStore(storeId, dto.leadId);

    const expiresAt =
      dto.expiresAt === null ? null : dto.expiresAt ? new Date(dto.expiresAt) : undefined;

    const reservation = await this.prisma.vehicleReservation.update({
      where: { id: existing.id },
      data: {
        customerId: dto.customerId === undefined ? undefined : dto.customerId,
        leadId: dto.leadId === undefined ? undefined : dto.leadId,
        expiresAt,
        notes: dto.notes === undefined ? undefined : dto.notes,
      } as any,
      include: {
        reservedBy: { select: { id: true, fullName: true, email: true } },
        customer: true,
        lead: true,
      },
    });

    return { reservation };
  }

  async unreserve(storeId: string, userId: string, vehicleId: string) {
    const vehicle = await this.ensureVehicleInStore(storeId, vehicleId);

    const existing = await this.prisma.vehicleReservation.findFirst({
      where: { storeId, vehicleId },
      select: { id: true, expiresAt: true },
    });
    if (!existing) throw new NotFoundException('RESERVATION_NOT_FOUND');

    // Si está expirada, cleanup ya hace el delete y status
    if (this.isExpired(existing.expiresAt)) {
      await this.cleanupIfExpired(storeId, vehicleId, userId);
      return { ok: true, unreserved: true, reason: 'EXPIRED_CLEANUP' };
    }

    // Si está SOLD no revertimos a AVAILABLE (por seguridad)
    return this.prisma.$transaction(async (tx) => {
      await tx.vehicleReservation.delete({ where: { id: existing.id } });

      if (vehicle.status === VehicleStatus.RESERVED) {
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });

        await tx.vehicleStatusHistory.create({
          data: {
            vehicleId,
            fromStatus: VehicleStatus.RESERVED,
            toStatus: VehicleStatus.AVAILABLE,
            changedByUserId: userId,
          } as any,
        });
      }

      return { ok: true, unreserved: true };
    });
  }
}
