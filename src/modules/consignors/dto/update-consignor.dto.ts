import { PartialType } from '@nestjs/swagger';
import { CreateConsignorDto } from './create-consignor.dto';

export class UpdateConsignorDto extends PartialType(CreateConsignorDto) { }
