import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadMediaDto {
  @IsOptional()
  @IsString()
  kind?: string; // IMAGE | VIDEO (opcional)

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isCover?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(0)
  position?: number;
}
