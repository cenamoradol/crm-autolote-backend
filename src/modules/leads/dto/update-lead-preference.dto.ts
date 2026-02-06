import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateLeadPreferenceDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  minPrice?: number | string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  maxPrice?: number | string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : parseInt(value, 10)))
  @IsInt()
  @Min(1900)
  yearFrom?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : parseInt(value, 10)))
  @IsInt()
  @Min(1900)
  yearTo?: number;

  @IsOptional()
  @IsString()
  desiredBrandId?: string;

  @IsOptional()
  @IsString()
  desiredModelId?: string;

  @IsOptional()
  @IsString()
  vehicleTypeId?: string;


  @IsOptional()
  @IsString()
  notes?: string;
}
