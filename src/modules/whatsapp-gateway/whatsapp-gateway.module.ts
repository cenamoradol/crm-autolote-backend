import { Module } from '@nestjs/common';
import { WhatsAppGatewayService } from './whatsapp-gateway.service';
import { WhatsAppSessionService } from './whatsapp-session.service';
import { WhatsAppMessageService } from './whatsapp-message.service';
import { WhatsAppHandlerService } from './whatsapp-handler.service';
import { WhatsAppFollowUpService } from './whatsapp-followup.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { VendorAssignmentModule } from '../vendor-assignment/vendor-assignment.module';
import { VehicleSearchModule } from '../vehicle-search/vehicle-search.module';

@Module({
  imports: [
    PrismaModule,
    VendorAssignmentModule,
    VehicleSearchModule,
  ],
  controllers: [],
  providers: [
    WhatsAppGatewayService,
    WhatsAppSessionService,
    WhatsAppMessageService,
    WhatsAppHandlerService,
    WhatsAppFollowUpService,
  ],
  exports: [
    WhatsAppGatewayService,
    WhatsAppSessionService,
    WhatsAppMessageService,
    WhatsAppHandlerService,
    WhatsAppFollowUpService,
  ],
})
export class WhatsAppGatewayModule {}
