import { IsOptional, IsString, IsInt, IsNumber, IsUUID } from 'class-validator';

export class CreateCustomerPreferenceDto {
    @IsUUID()
    @IsOptional()
    brandId?: string;

    @IsUUID()
    @IsOptional()
    modelId?: string;

    @IsInt()
    @IsOptional()
    yearFrom?: number;

    @IsInt()
    @IsOptional()
    yearTo?: number;

    @IsNumber()
    @IsOptional()
    minPrice?: number;

    @IsNumber()
    @IsOptional()
    maxPrice?: number;

    @IsString()
    @IsOptional()
    notes?: string;
}
