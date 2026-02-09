import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  branchId!: string;

  @IsString()
  brandId!: string;

  @IsString()
  modelId!: string;

  @IsOptional()
  @IsString()
  vehicleTypeId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  transmission?: string;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // precio en string para evitar float issues (ej "12500.00")
  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
