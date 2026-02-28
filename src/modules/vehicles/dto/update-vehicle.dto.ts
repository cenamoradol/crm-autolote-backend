import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min, MinLength, IsUUID } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  modelId?: string;

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
  @IsNumber()
  engineSize?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  offerPrice?: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsUUID(4)
  consignorId?: string;

  @IsOptional()
  @IsString()
  purchasePrice?: string;

  @IsOptional()
  @IsString()
  repairCosts?: string;

  @IsOptional()
  @IsString()
  paperworkCosts?: string;

  @IsOptional()
  @IsString()
  otherCosts?: string;
}
