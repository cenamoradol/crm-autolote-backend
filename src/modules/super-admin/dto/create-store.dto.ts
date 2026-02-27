import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  // slug para URL (demo-auto-lote)
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  // Dominio principal del tenant (portal.tudominio.com)
  @IsOptional()
  @IsString()
  primaryDomain?: string;

  @IsOptional()
  @IsString()
  primaryBranchName?: string;

  @IsOptional()
  @IsString()
  primaryBranchAddress?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10)
  currencySymbol?: string;
}
