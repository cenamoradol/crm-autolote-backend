import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { StoreContextGuard } from '../../common/guards/store-context.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { LicenseGuard } from '../../common/guards/license.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateBranchDto } from './dto/create-branch.dto';

@Controller('branches')
@UseGuards(JwtAuthGuard, StoreContextGuard, RolesGuard, LicenseGuard)
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list(@Req() req: any) {
    return this.branches.list(req.storeId);
  }

  @Post()
  @Roles('admin', 'supervisor')
  create(@Req() req: any, @Body() dto: CreateBranchDto) {
    return this.branches.create(req.storeId, dto);
  }

  @Patch(':id/set-primary')
  @Roles('admin', 'supervisor')
  setPrimary(@Req() req: any, @Param('id') id: string) {
    return this.branches.setPrimary(req.storeId, id);
  }
}
