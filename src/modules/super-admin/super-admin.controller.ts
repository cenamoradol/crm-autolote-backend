import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';

import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateDomainDto } from './dto/create-domain.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AssignMemberDto } from './dto/assign-member.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('sa')
export class SuperAdminController {
  constructor(private readonly sa: SuperAdminService) { }

  // -------- Stores --------
  @Post('stores')
  createStore(@Body() dto: CreateStoreDto) {
    return this.sa.createStore(dto);
  }

  @Get('stores')
  listStores(@Query('q') q?: string) {
    return this.sa.listStores(q);
  }

  @Get('stores/:id')
  getStore(@Param('id') id: string) {
    return this.sa.getStore(id);
  }

  @Patch('stores/:id')
  updateStore(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.sa.updateStore(id, dto);
  }

  // -------- Store Domains --------
  @Post('stores/:id/domains')
  addDomain(@Param('id') storeId: string, @Body() dto: CreateDomainDto) {
    return this.sa.addStoreDomain(storeId, dto);
  }

  @Delete('stores/:id/domains/:domainId')
  removeDomain(@Param('id') storeId: string, @Param('domainId') domainId: string) {
    return this.sa.removeStoreDomain(storeId, domainId);
  }

  // -------- Branches --------
  @Get('stores/:id/branches')
  listBranches(@Param('id') storeId: string) {
    return this.sa.listStoreBranches(storeId);
  }

  @Post('stores/:id/branches')
  createBranch(@Param('id') storeId: string, @Body() dto: CreateBranchDto) {
    return this.sa.createBranch(storeId, dto);
  }

  @Patch('stores/:id/branches/:branchId')
  updateBranch(
    @Param('id') storeId: string,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchDto
  ) {
    return this.sa.updateBranch(storeId, branchId, dto);
  }

  @Delete('stores/:id/branches/:branchId')
  removeBranch(@Param('id') storeId: string, @Param('branchId') branchId: string) {
    return this.sa.removeBranch(storeId, branchId);
  }

  // -------- Members (Permisos) --------
  @Get('stores/:id/members')
  listMembers(@Param('id') storeId: string) {
    return this.sa.listStoreMembers(storeId);
  }

  @Post('stores/:id/members/assign')
  assignMember(@Param('id') storeId: string, @Body() dto: AssignMemberDto) {
    return this.sa.assignMember(storeId, dto);
  }

  @Delete('stores/:id/members/:userId')
  removeMember(@Param('id') storeId: string, @Param('userId') userId: string) {
    return this.sa.removeMember(storeId, userId);
  }

  // -------- Users --------
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.sa.createUser(dto);
  }

  @Get('users')
  listUsers(@Query('q') q?: string, @Query('storeId') storeId?: string) {
    return this.sa.listUsers(q, storeId);
  }

  @Get('users/:id')
  getUser(@Param('id') userId: string) {
    return this.sa.getUser(userId);
  }

  @Patch('users/:id')
  updateUser(@Param('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.sa.updateUser(userId, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') userId: string) {
    return this.sa.deleteUser(userId);
  }

  // -------- Plans & Subscriptions --------
  @Get('plans')
  listPlans() {
    return this.sa.listPlans();
  }

  @Get('plans/:id')
  getPlan(@Param('id') id: string) {
    return this.sa.getPlan(id);
  }

  @Post('plans')
  createPlan(@Body() dto: any) {
    return this.sa.createPlan(dto);
  }

  @Patch('plans/:id')
  updatePlan(@Param('id') id: string, @Body() dto: any) {
    return this.sa.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
    return this.sa.deletePlan(id);
  }

  @Post('stores/:id/subscriptions')
  createSubscription(
    @Param('id') storeId: string,
    @Body() dto: { planId: string; months: number; provider?: string; amount?: number }
  ) {
    return this.sa.createSubscription(storeId, dto);
  }
}
