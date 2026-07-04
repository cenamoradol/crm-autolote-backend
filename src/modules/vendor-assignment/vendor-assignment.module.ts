import { Module } from '@nestjs/common';
import { VendorAssignmentService } from './vendor-assignment.service';
import { ConversationService } from './conversation.service';
import { BusinessHoursService } from './business-hours.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VendorAssignmentService, ConversationService, BusinessHoursService],
  exports: [VendorAssignmentService, ConversationService, BusinessHoursService],
})
export class VendorAssignmentModule {}
