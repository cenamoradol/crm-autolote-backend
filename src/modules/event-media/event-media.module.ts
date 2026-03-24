import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventMediaController } from './event-media.controller';
import { EventMediaService } from './event-media.service';
import { R2Service } from '../../common/r2/r2.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventMediaController],
  providers: [EventMediaService, R2Service],
})
export class EventMediaModule {}
