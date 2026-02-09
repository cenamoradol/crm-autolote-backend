import { IsOptional, IsString } from 'class-validator';

export class UpdateSaleDto {
    @IsOptional()
    @IsString()
    customerId?: string;

    @IsOptional()
    @IsString()
    leadId?: string;

    @IsOptional()
    @IsString()
    soldPrice?: string;

    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    soldByUserId?: string;
}
