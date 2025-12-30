import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReservationDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  leadId?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string; // ISO: "2025-12-29T23:59:00.000Z"

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
