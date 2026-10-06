import { Controller, Get, Post, Body, Query, Param, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CodRemittanceService } from './cod-remittance.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User, RemittanceStatus } from '@prisma/client';

@Controller()
export class CodRemittanceController {
  constructor(private codRemittance: CodRemittanceService) {}

  // Driver endpoints

  @Get('driver/cod/orders')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  getDriverEligibleOrders(
    @CurrentUser() user: User,
    @Query('date') date?: string,
  ) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    return this.codRemittance.getEligibleOrdersForRemittance(user.id, dateStr);
  }

  @Get('driver/remittances')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  async getDriverRemittances(
    @CurrentUser() user: User,
    @Query('status') status?: string,
  ) {
    const safeStatus = status && Object.values(RemittanceStatus).includes(status as RemittanceStatus)
      ? (status as RemittanceStatus)
      : undefined;
    return this.codRemittance.getDriverRemittances(user, safeStatus);
  }

  @Post('driver/remittances')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  async createDriverRemittance(
    @CurrentUser() user: User,
    @Body('date') date?: string,
  ) {
    const dateStr = date || new Date().toISOString().split('T')[0];
    return this.codRemittance.createRemittance(user, dateStr);
  }

  @Get('driver/remittances/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  async getDriverRemittance(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.codRemittance.getRemittance(user, id);
  }

  // Admin endpoints

  @Get('admin/remittances')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async listRemittances(
    @CurrentUser() user: User,
    @Query('date') date?: string,
    @Query('driverId') driverId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const safeStatus = status && Object.values(RemittanceStatus).includes(status as RemittanceStatus)
      ? (status as RemittanceStatus)
      : undefined;
    return this.codRemittance.listRemittances(user, { date, driverId, status: safeStatus, page, limit });
  }

  @Post('admin/remittances/:id/confirm')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async confirmRemittance(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.codRemittance.confirmRemittance(user, id);
  }

  @Get('admin/remittances/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getAdminRemittance(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.codRemittance.getRemittance(user, id);
  }
}
