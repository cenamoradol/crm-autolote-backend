import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateSaleDocumentDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsNotEmpty()
    fileKey!: string;

    @IsUrl()
    @IsNotEmpty()
    url!: string;
}
