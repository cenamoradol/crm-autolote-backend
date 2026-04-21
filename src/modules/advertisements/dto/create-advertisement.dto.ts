import { IsString, IsOptional, IsEnum, IsBoolean, IsInt } from 'class-validator';
import { AdPlacement, MediaKind } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateAdvertisementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(MediaKind)
  kind?: MediaKind;

  @IsOptional()
  @IsString()
  targetUrl?: string;

  @IsEnum(AdPlacement)
  placement: AdPlacement;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  position?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  weight?: number;
}
