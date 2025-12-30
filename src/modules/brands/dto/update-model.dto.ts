import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateModelDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  // opcional si querés mover el modelo a otra marca
  @IsOptional()
  @IsString()
  brandId?: string;
}
