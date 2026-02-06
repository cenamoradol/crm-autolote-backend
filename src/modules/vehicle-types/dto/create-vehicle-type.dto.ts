import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVehicleTypeDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}


