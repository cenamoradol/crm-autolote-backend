import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ConsignorsService } from './consignors.service';
import { CreateConsignorDto } from './dto/create-consignor.dto';
import { UpdateConsignorDto } from './dto/update-consignor.dto';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('consignors')
@Controller('consignors')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class ConsignorsController {
    constructor(private readonly consignorsService: ConsignorsService) { }

    @Get()
    @RequirePermissions('consignors:read')
    @ApiOperation({ summary: 'List consignors' })
    findAll(@Req() req: any, @Query('q') q: string) {
        return this.consignorsService.list(req.storeId, q);
    }

    @Get(':id')
    @RequirePermissions('consignors:read')
    @ApiOperation({ summary: 'Get consignor detail' })
    findOne(@Req() req: any, @Param('id') id: string) {
        return this.consignorsService.get(req.storeId, id);
    }

    @Post()
    @RequirePermissions('consignors:create')
    @ApiOperation({ summary: 'Create consignor' })
    create(@Req() req: any, @Body() createConsignorDto: CreateConsignorDto) {
        return this.consignorsService.create(req.storeId, req.user.sub, createConsignorDto);
    }

    @Patch(':id')
    @RequirePermissions('consignors:update')
    @ApiOperation({ summary: 'Update consignor' })
    update(@Req() req: any, @Param('id') id: string, @Body() updateConsignorDto: UpdateConsignorDto) {
        return this.consignorsService.update(req.storeId, id, updateConsignorDto);
    }

    @Delete(':id')
    @RequirePermissions('consignors:delete')
    @ApiOperation({ summary: 'Delete consignor' })
    remove(@Req() req: any, @Param('id') id: string) {
        return this.consignorsService.remove(req.storeId, id);
    }
}
