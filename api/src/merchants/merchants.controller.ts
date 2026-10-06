import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MerchantsService } from './merchants.service';
import { MerchantLedgerService } from './merchant-ledger.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';

@Controller('merchants')
export class MerchantsController {
  constructor(
    private merchants: MerchantsService,
    private ledger: MerchantLedgerService,
    private promoCodes: PromoCodesService,
  ) {}

  @Get()
  listPublic(@Query('categoryId') categoryId?: string, @Query('lat') lat?: string, @Query('lng') lng?: string) {
    return this.merchants.listPublic(
      lat ? parseFloat(lat) : undefined,
      lng ? parseFloat(lng) : undefined,
      categoryId,
    );
  }

  @Get('store/:slug')
  getOnePublic(@Param('slug') slug: string) {
    return this.merchants.getOnePublic(slug);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  getMyStore(@CurrentUser() user: User) {
    return this.merchants.getMyStore(user);
  }

  @Patch('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  updateMyStore(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.merchants.updateMyStore(user, body);
  }

  @Patch('me/categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  setStoreCategories(@CurrentUser() user: User, @Body('categoryIds') categoryIds: string[]) {
    return this.merchants.setStoreCategories(user, categoryIds || []);
  }

  @Get('me/finance/balance')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  async getMyBalance(@CurrentUser() user: User) {
    const profile = await this.merchants.getMyStore(user);
    return this.ledger.getMerchantBalance(profile.id);
  }

  @Get('me/finance/ledger')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  async getMyLedger(
    @CurrentUser() user: User,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const profile = await this.merchants.getMyStore(user);
    return this.ledger.getMerchantLedger(profile.id, page, limit);
  }

  @Get('me/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  async getMyStats(
    @CurrentUser() user: User,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.merchants.getMyStats(user, from, to);
  }

  @Get('me/promo-codes')
  @Get('me/promo-code')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  async getMyPromoCodes(@CurrentUser() user: User) {
    const profile = await this.merchants.getMyStore(user);
    return this.promoCodes.findByMerchant(profile.id);
  }

  @Post('me/promo-codes')
  @Post('me/promo-code')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  async createMyPromoCode(
    @CurrentUser() user: User,
    @Body()
    body: {
      code: string;
      description?: string;
      percentage: number;
      maxDiscount?: number | null;
      minSubtotal?: number | null;
      expiresAt?: string | null;
      isActive?: boolean;
    },
  ) {
    const profile = await this.merchants.getMyStore(user);
    return this.promoCodes.create({ ...body, merchantProfileId: profile.id });
  }

  @Patch('me/promo-codes/:id')
  @Patch('me/promo-code/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  async updateMyPromoCode(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body()
    body: {
      description?: string;
      percentage?: number;
      maxDiscount?: number | null;
      minSubtotal?: number | null;
      expiresAt?: string | null;
      isActive?: boolean;
    },
  ) {
    const profile = await this.merchants.getMyStore(user);
    return this.promoCodes.updateForMerchant(id, profile.id, body);
  }

  @Delete('me/promo-codes/:id')
  @Delete('me/promo-code/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  async deleteMyPromoCode(@CurrentUser() user: User, @Param('id') id: string) {
    const profile = await this.merchants.getMyStore(user);
    return this.promoCodes.deleteForMerchant(id, profile.id);
  }
}
