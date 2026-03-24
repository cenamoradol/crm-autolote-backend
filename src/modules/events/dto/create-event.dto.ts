import { IsString, IsOptional, IsUUID, IsBoolean, IsInt, IsDateString } from 'class-validator';

export class CreateEventDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsInt()
  position?: number;
}
