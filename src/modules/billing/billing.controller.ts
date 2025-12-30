import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ApproveBankTransferDto } from './dto/approve-bank-transfer.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  // ✅ Para UI (banner de expiración, plan actual, etc.)
  @Get('status')
  @Roles('admin', 'supervisor', 'seller')
  getStatus(@Req() req: any) {
    return this.billing.getStoreStatus(req.storeId);
  }

  // ✅ Planes activos globales
  @Get('plans')
  @Roles('admin', 'supervisor', 'seller')
  listPlans() {
    return this.billing.listPlans();
  }

  // ✅ Listar suscripciones del store
  @Get('subscriptions')
  @Roles('admin', 'supervisor')
  listSubscriptions(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.billing.listSubscriptions(req.storeId, {
      page: Number(page || 1),
      limit: Number(limit || 10),
      status,
    });
  }

  // ✅ Obtener una suscripción por id
  @Get('subscriptions/:id')
  @Roles('admin', 'supervisor')
  getSubscription(@Req() req: any, @Param('id') id: string) {
    return this.billing.getSubscription(req.storeId, id);
  }

  // ✅ Crear solicitud (PENDING)
  @Post('subscriptions')
  @Roles('admin', 'supervisor')
  createSubscription(@Req() req: any, @Body() dto: CreateSubscriptionDto) {
    return this.billing.createSubscription(req.storeId, req.user.sub, dto);
  }

  // ✅ Pagos
  @Get('subscriptions/:id/payments')
  @Roles('admin', 'supervisor')
  listPayments(@Req() req: any, @Param('id') subscriptionId: string) {
    return this.billing.listPayments(req.storeId, subscriptionId);
  }

  // ✅ Crear payment PENDING
  @Post('subscriptions/:id/payments')
  @Roles('admin', 'supervisor')
  createPayment(@Req() req: any, @Param('id') subscriptionId: string, @Body() dto: CreatePaymentDto) {
    return this.billing.createPayment(req.storeId, req.user.sub, subscriptionId, dto);
  }

  // ✅ Aprobar transferencia bancaria (admin) incluso si el store está expirado
  @Patch('subscriptions/:id/approve-bank-transfer')
  @Roles('admin')
  approveBankTransfer(
    @Req() req: any,
    @Param('id') subscriptionId: string,
    @Body() dto: ApproveBankTransferDto,
  ) {
    return this.billing.approveBankTransfer(req.storeId, req.user.sub, subscriptionId, dto);
  }

  // ✅ Cancelar suscripción
  @Patch('subscriptions/:id/cancel')
  @Roles('admin')
  cancel(@Req() req: any, @Param('id') subscriptionId: string) {
    return this.billing.cancelSubscription(req.storeId, req.user.sub, subscriptionId);
  }
}
