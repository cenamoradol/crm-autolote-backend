import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { PermissionSetsService } from './permission-sets.service';
import { CreatePermissionSetDto } from './dto/create-permission-set.dto';
import { UpdatePermissionSetDto } from './dto/update-permission-set.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('sa/permission-sets')
export class PermissionSetsController {
    constructor(private readonly service: PermissionSetsService) { }

    @Post()
    create(@Body() dto: CreatePermissionSetDto) {
        return this.service.create(dto);
    }

    @Get()
    findAll(@Query('storeId') storeId: string) {
        return this.service.findAll(storeId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdatePermissionSetDto) {
        return this.service.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.service.remove(id);
    }
}
