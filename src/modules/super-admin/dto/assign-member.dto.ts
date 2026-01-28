import { ArrayMinSize, IsArray, IsString } from 'class-validator';
import { RoleKey } from '@prisma/client';

export class AssignMemberDto {
  @IsString()
  userId!: string;

  @IsArray()
  @ArrayMinSize(1)
  roleKeys!: RoleKey[];
}
