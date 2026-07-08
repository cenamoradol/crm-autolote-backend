import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QuickSaleDto {
  @IsNumber()
  @Min(0)
  soldPrice!: number;

  @IsOptional()
  @IsUUID(4)
  customerId?: string;

  @IsOptional()
  @IsUUID(4)
  leadId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
