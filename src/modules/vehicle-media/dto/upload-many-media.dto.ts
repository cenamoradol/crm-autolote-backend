import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadManyMediaDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isCoverFirst?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  startPosition?: number;
}
