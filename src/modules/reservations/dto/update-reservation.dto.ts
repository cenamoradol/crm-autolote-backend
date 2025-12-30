import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateReservationDto {
  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsUUID()
  leadId?: string | null;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
