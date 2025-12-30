import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ActivityQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsString()
  q?: string; // search en notes

  @IsOptional()
  @IsString()
  type?: string; // ActivityType: CALL|WHATSAPP|EMAIL|MEETING|NOTE

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  createdFrom?: string; // YYYY-MM-DD o ISO

  @IsOptional()
  @IsString()
  createdTo?: string; // YYYY-MM-DD o ISO

  @IsOptional()
  @IsIn(['createdAt'])
  sortBy: 'createdAt' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
