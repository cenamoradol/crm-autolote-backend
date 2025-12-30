import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;
}
