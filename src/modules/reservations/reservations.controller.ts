import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { Roles } from '../../common/decorators/roles.decorator';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Controller('vehicles/:vehicleId/reservation')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard, LicenseGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  @Roles('admin', 'supervisor', 'seller')
  get(@Req() req: any, @Param('vehicleId') vehicleId: string) {
    return this.reservations.get(req.storeId, req.user.sub, vehicleId);
  }

  @Post()
  @Roles('admin', 'supervisor', 'seller')
  reserve(@Req() req: any, @Param('vehicleId') vehicleId: string, @Body() dto: CreateReservationDto) {
    return this.reservations.reserve(req.storeId, req.user.sub, vehicleId, dto);
  }

  @Patch()
  @Roles('admin', 'supervisor', 'seller')
  update(@Req() req: any, @Param('vehicleId') vehicleId: string, @Body() dto: UpdateReservationDto) {
    return this.reservations.update(req.storeId, req.user.sub, vehicleId, dto);
  }

  @Delete()
  @Roles('admin', 'supervisor', 'seller')
  unreserve(@Req() req: any, @Param('vehicleId') vehicleId: string) {
    return this.reservations.unreserve(req.storeId, req.user.sub, vehicleId);
  }
}
