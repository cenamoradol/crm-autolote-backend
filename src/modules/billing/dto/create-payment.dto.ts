import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalId?: string;

  @IsOptional()
  metadata?: any;
}
