import { Controller, Get, Post, Body, Query, Param, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MerchantLedgerService } from './merchant-ledger.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';

@Controller('admin/merchants')
export class MerchantLedgerController {
  constructor(private ledger: MerchantLedgerService) {}

  @Get('balances')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getAllMerchantsWithBalances(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.ledger.getAllMerchantsWithBalances(user, page, limit);
  }

  @Get(':id/balance')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getMerchantBalance(
    @CurrentUser() user: User,
    @Param('id') merchantId: string,
  ) {
    return this.ledger.getMerchantBalance(merchantId);
  }

  @Get(':id/ledger')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getMerchantLedger(
    @CurrentUser() user: User,
    @Param('id') merchantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.ledger.getMerchantLedger(merchantId, page, limit);
  }

  @Get(':id/details')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async getMerchantDetails(
    @CurrentUser() user: User,
    @Param('id') merchantId: string,
  ) {
    return this.ledger.getMerchantDetails(user, merchantId);
  }

  @Post(':id/payout')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async createPayout(
    @CurrentUser() user: User,
    @Param('id') merchantId: string,
    @Body('amount') amount: number,
    @Body('note') note?: string,
  ) {
    return this.ledger.createPayout(user, merchantId, amount, note);
  }
}
