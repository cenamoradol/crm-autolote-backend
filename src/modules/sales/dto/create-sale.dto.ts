import { IsOptional, IsString } from 'class-validator';

export class CreateSaleDto {
  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  // opcional: string decimal "11500.00"
  @IsOptional()
  @IsString()
  soldPrice?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  soldByUserId?: string;
}
