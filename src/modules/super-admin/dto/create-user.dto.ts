import { IsBoolean, IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 120)
  password!: string;

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
}
