import { IsNotEmpty, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignMemberDto {
  @IsString()
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsObject()
  permissions?: any;

  @IsOptional()
  @IsString()
  @IsUUID()
  permissionSetId?: string;
}
