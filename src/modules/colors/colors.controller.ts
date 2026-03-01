import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ColorsService } from './colors.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';

@Controller('colors')
// Any logged in user in a valid store can access the endpoints based on their permissions
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard)
export class ColorsController {
    constructor(private readonly colors: ColorsService) { }

    @Get()
    // Listing colors does not require specific permissions, it's public inside the company
    list(@Query('q') q?: string) {
        return this.colors.list(q);
    }

    @Post()
    @RequirePermissions('vehicle_types:create') // we reuse vehicle_types permissions for colors
    create(@Body('name') name: string) {
        return this.colors.create(name);
    }

    @Patch(':id')
    @RequirePermissions('vehicle_types:update')
    update(@Param('id') id: string, @Body('name') name: string) {
        return this.colors.update(id, name);
    }

    @Delete(':id')
    @RequirePermissions('vehicle_types:delete')
    remove(@Param('id') id: string) {
        return this.colors.remove(id);
    }
}
