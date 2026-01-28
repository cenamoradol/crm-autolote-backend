import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullName?: string;

  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Si lo envías, se recalcula el hash
  @IsOptional()
  @IsString()
  @Length(8, 120)
  password?: string;
}
