import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './modules/auth/auth.module';
import { PublicModule } from './modules/public/public.module';
import { MeModule } from './modules/me/me.module';
import { BrandsModule } from './modules/brands/brands.module';
import { CustomersModule } from './modules/customers/customers.module';

import { BranchesModule } from './modules/branches/branches.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { SalesModule } from './modules/sales/sales.module';
import { BillingModule } from './modules/billing/billing.module';

import { LeadsModule } from './modules/leads/leads.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { VehicleMediaModule } from './modules/vehicle-media/vehicle-media.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { StoreSettingsModule } from './modules/store-settings/store-settings.module';

import { HealthModule } from './modules/health/health.module';

// Rate limit
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Audit (opcional por env)
import { QueuesModule } from './queues/queues.module';
import { AuditModule } from './queues/audit/audit.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

const AUDIT_ENABLED = process.env.AUDIT_ENABLED === 'true';

@Module({
  imports: [
    PrismaModule,

    // Rate limit
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL || 60),
        limit: Number(process.env.THROTTLE_LIMIT || 120),
      },
    ]),

    AuthModule,
    PublicModule,

    MeModule,
    BrandsModule,

    CustomersModule,

    BranchesModule,
    VehiclesModule,
    SalesModule,
    BillingModule,

    LeadsModule,
    ActivitiesModule,
    VehicleMediaModule,
    ReservationsModule,
    StoreSettingsModule,

    HealthModule,

    ...(AUDIT_ENABLED ? [QueuesModule, AuditModule] : []),
  ],
  providers: [
    // Rate limit global
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    ...(AUDIT_ENABLED
      ? [
          {
            provide: APP_INTERCEPTOR,
            useClass: AuditInterceptor,
          },
        ]
      : []),
  ],
})
export class AppModule {}
