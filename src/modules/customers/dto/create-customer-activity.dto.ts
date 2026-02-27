import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCustomerActivityDto {
    @IsEnum(['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'NOTE'])
    type!: string;

    @IsString()
    @IsOptional()
    notes?: string;
}
