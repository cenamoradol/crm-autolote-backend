import { IsString } from 'class-validator';

export class AssignLeadDto {
  @IsString()
  assignedToUserId: string;
}
