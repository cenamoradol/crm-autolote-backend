import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  domain!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
