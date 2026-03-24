import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller()
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class EventsController {
  constructor(private readonly events: EventsService) {}

  // ─── Categories ────────────────────────────────────────────

  @Get('event-categories')
  @RequirePermissions('inventory:read')
  listCategories(@Req() req: any) {
    return this.events.listCategories(req.storeId);
  }

  @Post('event-categories')
  @RequirePermissions('inventory:create')
  createCategory(@Req() req: any, @Body() dto: CreateEventCategoryDto) {
    return this.events.createCategory(req.storeId, dto);
  }

  @Patch('event-categories/:id')
  @RequirePermissions('inventory:update')
  updateCategory(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEventCategoryDto,
  ) {
    return this.events.updateCategory(req.storeId, id, dto);
  }

  @Delete('event-categories/:id')
  @RequirePermissions('inventory:delete')
  deleteCategory(@Req() req: any, @Param('id') id: string) {
    return this.events.deleteCategory(req.storeId, id);
  }

  // ─── Events ────────────────────────────────────────────────

  @Get('events')
  @RequirePermissions('inventory:read')
  listEvents(@Req() req: any, @Query('categoryId') categoryId?: string) {
    return this.events.listEvents(req.storeId, categoryId);
  }

  @Get('events/:id')
  @RequirePermissions('inventory:read')
  getEvent(@Req() req: any, @Param('id') id: string) {
    return this.events.getEvent(req.storeId, id);
  }

  @Post('events')
  @RequirePermissions('inventory:create')
  createEvent(@Req() req: any, @Body() dto: CreateEventDto) {
    return this.events.createEvent(req.storeId, dto);
  }

  @Patch('events/:id')
  @RequirePermissions('inventory:update')
  updateEvent(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.events.updateEvent(req.storeId, id, dto);
  }

  @Patch('events/:id/publish')
  @RequirePermissions('inventory:update')
  publish(@Req() req: any, @Param('id') id: string, @Body() body: { isPublished: boolean }) {
    return this.events.setPublish(req.storeId, id, !!body?.isPublished);
  }

  @Delete('events/:id')
  @RequirePermissions('inventory:delete')
  deleteEvent(@Req() req: any, @Param('id') id: string) {
    return this.events.deleteEvent(req.storeId, id);
  }

  // ─── Event Vehicles ────────────────────────────────────────

  @Post('events/:id/vehicles')
  @RequirePermissions('inventory:update')
  addVehicles(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { vehicleIds: string[] },
  ) {
    return this.events.addVehicles(req.storeId, id, body.vehicleIds);
  }

  @Delete('events/:id/vehicles/:vehicleId')
  @RequirePermissions('inventory:update')
  removeVehicle(
    @Req() req: any,
    @Param('id') id: string,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.events.removeVehicle(req.storeId, id, vehicleId);
  }
}
