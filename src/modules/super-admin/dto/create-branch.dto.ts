import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateBranchDto {
    @IsString()
    @Length(2, 80)
    name: string;

    @IsOptional()
    @IsString()
    @Length(5, 200)
    address?: string;

    @IsOptional()
    @IsBoolean()
    isPrimary?: boolean;
}
