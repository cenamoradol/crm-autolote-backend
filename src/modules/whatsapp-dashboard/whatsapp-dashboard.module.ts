import { Module } from '@nestjs/common';
import { WhatsAppDashboardController } from './whatsapp-dashboard.controller';
import { WhatsAppDashboardService } from './whatsapp-dashboard.service';
import { VendorAssignmentModule } from '../vendor-assignment/vendor-assignment.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, VendorAssignmentModule],
  controllers: [WhatsAppDashboardController],
  providers: [WhatsAppDashboardService],
  exports: [WhatsAppDashboardService],
})
export class WhatsAppDashboardModule {}
