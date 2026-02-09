
import { IsOptional, IsDateString } from 'class-validator';

export class DashboardFilterDto {
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
