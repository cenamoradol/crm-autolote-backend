import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

@Controller('vehicles/:vehicleId/reservation')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) { }

  @Get()
  @RequirePermissions('inventory:update')
  get(@Req() req: any, @Param('vehicleId') vehicleId: string) {
    return this.reservations.get(req.storeId, req.user.sub, vehicleId);
  }

  @Post()
  @RequirePermissions('inventory:update')
  reserve(@Req() req: any, @Param('vehicleId') vehicleId: string, @Body() dto: CreateReservationDto) {
    return this.reservations.reserve(req.storeId, req.user.sub, vehicleId, dto);
  }

  @Patch()
  @RequirePermissions('inventory:update')
  update(@Req() req: any, @Param('vehicleId') vehicleId: string, @Body() dto: UpdateReservationDto) {
    return this.reservations.update(req.storeId, req.user.sub, vehicleId, dto);
  }

  @Delete()
  @RequirePermissions('inventory:update')
  unreserve(@Req() req: any, @Param('vehicleId') vehicleId: string) {
    return this.reservations.unreserve(req.storeId, req.user.sub, vehicleId);
  }
}
