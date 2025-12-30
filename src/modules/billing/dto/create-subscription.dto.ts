import { IsEnum, IsUUID } from 'class-validator';
import { SubscriptionProvider } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsUUID()
  planId: string;

  @IsEnum(SubscriptionProvider)
  provider: SubscriptionProvider; // PAYPAL | BANK_TRANSFER
}
