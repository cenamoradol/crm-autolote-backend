import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CreateBranchDto } from './dto/create-branch.dto';

@Controller('branches')
@UseGuards(JwtAuthGuard, StoreContextGuard, PermissionsGuard, LicenseGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) { }

  @Get()
  list(@Req() req: any) {
    return this.branches.list(req.storeId);
  }

  @Post()
  @RequirePermissions('store_settings:update')
  create(@Req() req: any, @Body() dto: CreateBranchDto) {
    return this.branches.create(req.storeId, dto);
  }

  @Patch(':id/set-primary')
  @RequirePermissions('store_settings:update')
  setPrimary(@Req() req: any, @Param('id') id: string) {
    return this.branches.setPrimary(req.storeId, id);
  }
}
