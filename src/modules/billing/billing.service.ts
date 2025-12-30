import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionProvider, SubscriptionStatus, PaymentStatus } from '@prisma/client';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApproveBankTransferDto } from './dto/approve-bank-transfer.dto';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private addMonths(from: Date, months: number) {
    const d = new Date(from);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  async listPlans() {
    const data = await this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    return { data };
  }

  // ✅ retorna ACTIVE o latest
  async getStoreStatus(storeId: string) {
    const now = new Date();

    // auto-expire (por si no se ejecutó LicenseGuard aún)
    await this.prisma.storeSubscription.updateMany({
      where: {
        storeId,
        status: SubscriptionStatus.ACTIVE,
        endsAt: { not: null, lte: now },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    const active = await this.prisma.storeSubscription.findFirst({
      where: {
        storeId,
        status: SubscriptionStatus.ACTIVE,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (active) return { status: 'ACTIVE', subscription: active };

    const latest = await this.prisma.storeSubscription.findFirst({
      where: { storeId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return { status: latest?.status ?? 'NONE', subscription: latest ?? null };
  }

  async listSubscriptions(storeId: string, opts: { page: number; limit: number; status?: string }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(50, Math.max(1, opts.limit || 10));
    const skip = (page - 1) * limit;

    const where: any = { storeId };
    if (opts.status) where.status = opts.status;

    const [total, data] = await this.prisma.$transaction([
      this.prisma.storeSubscription.count({ where }),
      this.prisma.storeSubscription.findMany({
        where,
        include: {
          plan: true,
          payments: { orderBy: { createdAt: 'desc' }, take: 20 },
          approvedBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { page, limit, total, data };
  }

  async getSubscription(storeId: string, id: string) {
    const sub = await this.prisma.storeSubscription.findFirst({
      where: { id, storeId },
      include: {
        plan: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 50 },
        approvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!sub) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');
    return sub;
  }

  async createSubscription(storeId: string, userId: string, dto: CreateSubscriptionDto) {
    const plan = await this.prisma.plan.findFirst({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) throw new NotFoundException('PLAN_NOT_FOUND');

    const now = new Date();

    // auto-expire por seguridad
    await this.prisma.storeSubscription.updateMany({
      where: {
        storeId,
        status: SubscriptionStatus.ACTIVE,
        endsAt: { not: null, lte: now },
      },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    // Si ya hay ACTIVE vigente, no creamos otra
    const active = await this.prisma.storeSubscription.findFirst({
      where: {
        storeId,
        status: SubscriptionStatus.ACTIVE,
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { id: true },
    });
    if (active) throw new ForbiddenException('SUBSCRIPTION_ALREADY_ACTIVE');

    // Evitar spam: reusar PENDING reciente si existe
    const pending = await this.prisma.storeSubscription.findFirst({
      where: {
        storeId,
        status: SubscriptionStatus.PENDING,
        planId: dto.planId,
        provider: dto.provider,
      },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
    if (pending) return { subscription: pending, reused: true };

    const subscription = await this.prisma.storeSubscription.create({
      data: {
        storeId,
        planId: dto.planId,
        provider: dto.provider,
        status: SubscriptionStatus.PENDING,
      },
      include: { plan: true },
    });

    return { subscription, reused: false };
  }

  async listPayments(storeId: string, subscriptionId: string) {
    const sub = await this.prisma.storeSubscription.findFirst({
      where: { id: subscriptionId, storeId },
      select: { id: true },
    });
    if (!sub) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');

    const data = await this.prisma.payment.findMany({
      where: { storeSubscriptionId: subscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    return { data };
  }

  async createPayment(storeId: string, userId: string, subscriptionId: string, dto: CreatePaymentDto) {
    const sub = await this.prisma.storeSubscription.findFirst({
      where: { id: subscriptionId, storeId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');

    // ✅ FIX: comparación directa (sin includes)
    if (sub.status !== SubscriptionStatus.PENDING && sub.status !== SubscriptionStatus.EXPIRED) {
      throw new ForbiddenException('SUBSCRIPTION_NOT_PAYABLE');
    }

    const payment = await this.prisma.payment.create({
      data: {
        storeSubscriptionId: sub.id,
        provider: sub.provider,
        status: PaymentStatus.PENDING,
        amount: sub.plan.priceMonthly,
        currency: sub.plan.currency,
        externalId: dto.externalId ?? null,
        metadata: dto.metadata ?? null,
      },
    });

    return { payment };
  }

  async approveBankTransfer(
    storeId: string,
    adminUserId: string,
    subscriptionId: string,
    dto: ApproveBankTransferDto,
  ) {
    const sub = await this.prisma.storeSubscription.findFirst({
      where: { id: subscriptionId, storeId },
      include: { plan: true },
    });
    if (!sub) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');

    if (sub.provider !== SubscriptionProvider.BANK_TRANSFER) {
      throw new ForbiddenException('NOT_BANK_TRANSFER_SUBSCRIPTION');
    }

    const months = dto.months ?? 1;
    const now = new Date();
    const endsAt = this.addMonths(now, months);

    return this.prisma.$transaction(async (tx) => {
      // 1) Expirar cualquier ACTIVE previa
      await tx.storeSubscription.updateMany({
        where: { storeId, status: SubscriptionStatus.ACTIVE },
        data: { status: SubscriptionStatus.EXPIRED, endsAt: now },
      });

      // 2) Activar esta
      const updatedSub = await tx.storeSubscription.update({
        where: { id: sub.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          startsAt: now,
          endsAt,
          approvedByUserId: adminUserId,
          approvedAt: now,
        },
        include: { plan: true },
      });

      // 3) Marcar payment como PAID (si no hay, crearlo)
      const existingPayment = await tx.payment.findFirst({
        where: { storeSubscriptionId: sub.id },
        orderBy: { createdAt: 'desc' },
      });

      const paidPayment = existingPayment
        ? await tx.payment.update({
            where: { id: existingPayment.id },
            data: { status: PaymentStatus.PAID, paidAt: now },
          })
        : await tx.payment.create({
            data: {
              storeSubscriptionId: sub.id,
              provider: SubscriptionProvider.BANK_TRANSFER,
              status: PaymentStatus.PAID,
              amount: sub.plan.priceMonthly,
              currency: sub.plan.currency,
              paidAt: now,
              metadata: { approvedManually: true },
            },
          });

      return { subscription: updatedSub, payment: paidPayment };
    });
  }

  async cancelSubscription(storeId: string, adminUserId: string, subscriptionId: string) {
    const sub = await this.prisma.storeSubscription.findFirst({
      where: { id: subscriptionId, storeId },
      select: { id: true },
    });
    if (!sub) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');

    const now = new Date();

    const updated = await this.prisma.storeSubscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        canceledAt: now,
        endsAt: now,
      },
    });

    return { subscription: updated };
  }
}
