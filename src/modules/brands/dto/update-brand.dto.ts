import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
