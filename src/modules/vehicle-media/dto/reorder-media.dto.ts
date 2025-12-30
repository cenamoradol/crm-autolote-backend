import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderMediaDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderedIds: string[];
}
