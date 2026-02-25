import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConsignorDto {
    @IsString()
    @IsNotEmpty()
    fullName!: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
