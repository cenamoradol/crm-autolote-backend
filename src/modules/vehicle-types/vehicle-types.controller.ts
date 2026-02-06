import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VehicleTypesService } from './vehicle-types.service';
import { CreateVehicleTypeDto } from './dto/create-vehicle-type.dto';
import { UpdateVehicleTypeDto } from './dto/update-vehicle-type.dto';

@Controller('vehicle-types')
export class VehicleTypesController {
  constructor(private readonly vehicleTypesService: VehicleTypesService) { }

  @Post()
  create(@Body() createVehicleTypeDto: CreateVehicleTypeDto) {
    return this.vehicleTypesService.create(createVehicleTypeDto);
  }

  @Get()
  findAll() {
    return this.vehicleTypesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehicleTypesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateVehicleTypeDto: UpdateVehicleTypeDto) {
    return this.vehicleTypesService.update(id, updateVehicleTypeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vehicleTypesService.remove(id);
  }

}
