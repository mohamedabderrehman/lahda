import { Controller, Get, Param, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettlementReceiptService } from './settlement-receipt.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';

@Controller('admin/settlements')
export class SettlementReceiptController {
  constructor(private receipts: SettlementReceiptService) {}

  @Get('receipts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listReceipts(
    @CurrentUser() user: User,
    @Query('partyType') partyType?: string,
    @Query('partyId') partyId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.receipts.listReceipts(user, { partyType, partyId, page, limit });
  }

  @Get('receipts/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getReceipt(@CurrentUser() user: User, @Param('id') id: string) {
    return this.receipts.getReceipt(user, id);
  }
}
