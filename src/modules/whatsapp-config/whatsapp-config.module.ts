import { Module } from '@nestjs/common';
import { WhatsAppConfigController } from './whatsapp-config.controller';
import { WhatsAppConfigService } from './whatsapp-config.service';
import { WhatsAppGatewayModule } from '../whatsapp-gateway/whatsapp-gateway.module';
import { VendorAssignmentModule } from '../vendor-assignment/vendor-assignment.module';
import { VehicleSearchModule } from '../vehicle-search/vehicle-search.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    WhatsAppGatewayModule,
    VendorAssignmentModule,
    VehicleSearchModule,
  ],
  controllers: [WhatsAppConfigController],
  providers: [WhatsAppConfigService],
})
export class WhatsAppConfigModule {}
