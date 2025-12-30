import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ApproveBankTransferDto {
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  months?: number; // default 1
}
