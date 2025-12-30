import { IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MaxLength(60)
  name: string;
}
