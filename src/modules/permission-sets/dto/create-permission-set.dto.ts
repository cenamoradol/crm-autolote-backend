import { IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator';

export class CreatePermissionSetDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsObject()
    @IsNotEmpty()
    permissions!: any;

    @IsString()
    @IsUUID()
    @IsNotEmpty()
    storeId!: string;
}
