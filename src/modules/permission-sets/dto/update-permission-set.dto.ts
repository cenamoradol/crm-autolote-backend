import { PartialType } from '@nestjs/mapped-types';
import { CreatePermissionSetDto } from './create-permission-set.dto';

export class UpdatePermissionSetDto extends PartialType(CreatePermissionSetDto) { }
