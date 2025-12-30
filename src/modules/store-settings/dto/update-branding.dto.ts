import { IsOptional, IsString, MaxLength, IsUrl } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string | null;
}
