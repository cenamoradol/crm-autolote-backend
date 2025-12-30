import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class LeadQueryDto {
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
  q?: string;

  // LeadStatus: NEW | IN_PROGRESS | WON | LOST
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  // filtros por fecha (opcional)
  @IsOptional()
  @IsString()
  createdFrom?: string; // YYYY-MM-DD o ISO

  @IsOptional()
  @IsString()
  createdTo?: string; // YYYY-MM-DD o ISO

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt'])
  sortBy: 'createdAt' | 'updatedAt' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
