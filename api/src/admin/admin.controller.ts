import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { CategoriesService } from '../categories/categories.service';
import { SettingsService } from '../settings/settings.service';
import { PromoBannersService } from '../promo-banners/promo-banners.service';
import { SupportChannelsService } from '../support-channels/support-channels.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';
import { Response } from 'express';

@Controller('admin')
export class AdminController {
  constructor(
    private admin: AdminService,
    private categories: CategoriesService,
    private settings: SettingsService,
    private promoBanners: PromoBannersService,
    private supportChannels: SupportChannelsService,
  ) {}

  @Get('stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getStats(@CurrentUser() user: User) {
    return this.admin.getStats(user);
  }

  @Get('stats/orders-series')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getOrdersSeries(@CurrentUser() user: User, @Query('from') from?: string, @Query('to') to?: string) {
    return this.admin.getOrdersSeries(user, from, to);
  }

  @Get('stats/orders-by-status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getOrdersByStatus(@CurrentUser() user: User) {
    return this.admin.getOrdersByStatus(user);
  }

  @Get('stats/top-merchants')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getTopMerchants(@CurrentUser() user: User, @Query('by') by?: string, @Query('limit') limit?: string) {
    return this.admin.getTopMerchants(user, (by === 'revenue' ? 'revenue' : 'orders'), limit ? parseInt(limit, 10) : 10);
  }

  @Get('stats/top-drivers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getTopDrivers(@CurrentUser() user: User, @Query('limit') limit?: string) {
    return this.admin.getTopDrivers(user, limit ? parseInt(limit, 10) : 10);
  }

  @Get('stats/ratings-overview')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getRatingsOverview(@CurrentUser() user: User) {
    return this.admin.getRatingsOverview(user);
  }

  @Get('reports/orders.csv')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async exportOrdersCsv(
    @CurrentUser() user: User,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('merchantId') merchantId?: string,
    @Query('driverId') driverId?: string,
  ) {
    const csv = await this.admin.exportOrdersCsv(user, { from, to, status, merchantId, driverId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-report.csv"');
    res.send(csv);
  }

  @Get('users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listUsers(@CurrentUser() user: User, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.admin.listUsers(user, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
  }

  @Get('users/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  getOneUser(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.getOneUser(user, id);
  }

  @Patch('users/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateUser(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body()
    body: { email?: string; fullName?: string; phone?: string | null; role?: string; isActive?: boolean; newPassword?: string },
  ) {
    return this.admin.updateUser(user, id, body);
  }

  @Get('merchants')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listMerchants(@CurrentUser() user: User, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.admin.listMerchants(user, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
  }

  @Get('merchants/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listMerchantsAll(@CurrentUser() user: User) {
    return this.admin.listMerchantsAll(user);
  }

  @Post('merchants')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createMerchant(
    @CurrentUser() user: User,
    @Body()
    body: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      storeName: string;
      storeSlug: string;
      logoUrl?: string;
      coverUrl?: string;
      description?: string;
      addressText?: string;
      latitude?: number;
      longitude?: number;
      storePhone?: string;
      storeEmail?: string;
      openingTime?: string;
      closingTime?: string;
      isOpen?: boolean;
      isApproved?: boolean;
      minOrder?: number;
      deliveryFee?: number;
      hasOffers?: boolean;
      ratingAvg?: number;
      ratingCount?: number;
      estimatedDeliveryMin?: number;
      estimatedDeliveryMax?: number;
      discountLabel?: string;
      categoryIds?: string[];
    },
  ) {
    return this.admin.createMerchant(user, body);
  }

  @Patch('merchants/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateMerchant(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body()
    body: {
      storeName?: string;
      storeSlug?: string;
      logoUrl?: string;
      coverUrl?: string;
      description?: string;
      addressText?: string;
      latitude?: number;
      longitude?: number;
      storePhone?: string;
      storeEmail?: string;
      openingTime?: string;
      closingTime?: string;
      isOpen?: boolean;
      isApproved?: boolean;
      minOrder?: number;
      deliveryFee?: number;
      hasOffers?: boolean;
      ratingAvg?: number;
      ratingCount?: number;
      estimatedDeliveryMin?: number;
      estimatedDeliveryMax?: number;
      discountLabel?: string;
      categoryIds?: string[];
      taxPercent?: number;
    },
  ) {
    return this.admin.updateMerchant(user, id, body);
  }

  @Get('drivers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listDrivers(@CurrentUser() user: User, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.admin.listDrivers(user, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20);
  }

  @Post('drivers')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createDriver(
    @CurrentUser() user: User,
    @Body()
    body: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      nationalId?: string;
      vehicleInfo?: string;
      isApproved?: boolean;
    },
  ) {
    return this.admin.createDriver(user, body);
  }

  @Patch('drivers/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateDriver(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body()
    body: {
      email?: string;
      fullName?: string;
      phone?: string | null;
      isActive?: boolean;
      nationalId?: string;
      vehicleInfo?: string;
      isApproved?: boolean;
      newPassword?: string;
    },
  ) {
    return this.admin.updateDriver(user, id, body);
  }

  @Get('orders')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listOrders(@CurrentUser() user: User, @Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string) {
    return this.admin.listOrders(user, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20, status);
  }

  @Patch('merchants/:id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  approveMerchant(@CurrentUser() user: User, @Param('id') id: string, @Body('approved') approved: boolean) {
    return this.admin.approveMerchant(user, id, approved);
  }

  @Delete('merchants/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteMerchant(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.deleteMerchant(user, id);
  }

  @Patch('drivers/:id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  approveDriver(@CurrentUser() user: User, @Param('id') id: string, @Body('approved') approved: boolean) {
    return this.admin.approveDriver(user, id, approved);
  }

  @Patch('users/:id/active')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  setUserActive(@CurrentUser() user: User, @Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.admin.setUserActive(user, id, isActive);
  }

  @Delete('users/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteUser(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.deleteUser(user, id);
  }

  @Patch('settings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateSettings(
    @CurrentUser() user: User,
    @Body()
    body: {
      appLogoUrl?: string;
      appNameAr?: string;
      appNameEn?: string;
      pricingConfig?: any;
      rewardChallengeConfig?: { timeWindowMinutes: number; tiers: { trips: number; amount: number }[] };
    },
  ) {
    return this.settings.updateSettings(body);
  }

  @Get('categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listCategories(@CurrentUser() user: User) {
    return this.categories.findAllAdmin();
  }

  @Post('categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createCategory(@CurrentUser() user: User, @Body() body: { nameAr: string; nameEn?: string; slug: string; iconUrl?: string; sortOrder?: number }) {
    return this.categories.create(body);
  }

  @Patch('categories/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateCategory(@CurrentUser() user: User, @Param('id') id: string, @Body() body: { nameAr?: string; nameEn?: string; slug?: string; iconUrl?: string; sortOrder?: number; isActive?: boolean }) {
    return this.categories.update(id, body);
  }

  @Delete('categories/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteCategory(@CurrentUser() user: User, @Param('id') id: string) {
    return this.categories.delete(id);
  }

  @Get('promo-banners')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listPromoBanners(@CurrentUser() user: User) {
    return this.promoBanners.findAll();
  }

  @Post('promo-banners')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createPromoBanner(@CurrentUser() user: User, @Body() body: { titleAr: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number }) {
    return this.promoBanners.create(body);
  }

  @Patch('promo-banners/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updatePromoBanner(@CurrentUser() user: User, @Param('id') id: string, @Body() body: { titleAr?: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number; isActive?: boolean }) {
    return this.promoBanners.update(id, body);
  }

  @Delete('promo-banners/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deletePromoBanner(@CurrentUser() user: User, @Param('id') id: string) {
    return this.promoBanners.delete(id);
  }

  @Get('merchants/:id/products')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listMerchantProducts(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.listMerchantProducts(user, id);
  }

  @Post('merchants/:id/products')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createMerchantProduct(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { productCategoryId?: string; nameAr: string; nameEn?: string; description?: string; price: number; imageUrl?: string; isAvailable?: boolean; sortOrder?: number },
  ) {
    return this.admin.createMerchantProduct(user, id, body);
  }

  @Patch('products/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateProduct(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { productCategoryId?: string; nameAr?: string; nameEn?: string; description?: string; price?: number; imageUrl?: string; isAvailable?: boolean; sortOrder?: number },
  ) {
    return this.admin.updateProduct(user, id, body);
  }

  @Get('merchants/:id/product-categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listMerchantProductCategories(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.listMerchantProductCategories(user, id);
  }

  @Post('merchants/:id/product-categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createMerchantProductCategory(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { nameAr: string; nameEn?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.admin.createMerchantProductCategory(user, id, body);
  }

  @Patch('product-categories/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateMerchantProductCategory(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { nameAr?: string; nameEn?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.admin.updateMerchantProductCategory(user, id, body);
  }

  @Delete('product-categories/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteMerchantProductCategory(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.deleteMerchantProductCategory(user, id);
  }

  @Delete('products/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteProduct(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.deleteProduct(user, id);
  }

  @Get('home-sections')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listHomeSections(@CurrentUser() user: User) {
    return this.admin.listHomeSections(user);
  }

  @Post('home-sections')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createHomeSection(
    @CurrentUser() user: User,
    @Body() body: { titleAr: string; titleEn?: string; slug?: string; sortOrder?: number; isActive?: boolean; merchantIds?: string[] },
  ) {
    return this.admin.createHomeSection(user, body);
  }

  @Patch('home-sections/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateHomeSection(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { titleAr?: string; titleEn?: string; slug?: string; sortOrder?: number; isActive?: boolean; merchantIds?: string[] },
  ) {
    return this.admin.updateHomeSection(user, id, body);
  }

  @Delete('home-sections/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteHomeSection(@CurrentUser() user: User, @Param('id') id: string) {
    return this.admin.deleteHomeSection(user, id);
  }

  @Get('support-channels')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listSupportChannels() {
    return this.supportChannels.findAllAdmin();
  }

  @Post('support-channels')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createSupportChannel(@Body() body: { type: string; label: string; value: string; iconName?: string; sortOrder?: number; isActive?: boolean }) {
    return this.supportChannels.create(body);
  }

  @Patch('support-channels/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateSupportChannel(@Param('id') id: string, @Body() body: { type?: string; label?: string; value?: string; iconName?: string; sortOrder?: number; isActive?: boolean }) {
    return this.supportChannels.update(id, body);
  }

  @Delete('support-channels/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteSupportChannel(@Param('id') id: string) {
    return this.supportChannels.delete(id);
  }

  // FAQ endpoints
  @Get('faq')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listFaq() {
    return this.admin.listFaq();
  }

  @Post('faq')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  createFaq(@Body() body: { questionAr: string; questionEn?: string; answerAr: string; answerEn?: string; sortOrder?: number; isActive?: boolean }) {
    return this.admin.createFaq(body);
  }

  @Patch('faq/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  updateFaq(@Param('id') id: string, @Body() body: { questionAr?: string; questionEn?: string; answerAr?: string; answerEn?: string; sortOrder?: number; isActive?: boolean }) {
    return this.admin.updateFaq(id, body);
  }

  @Delete('faq/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  deleteFaq(@Param('id') id: string) {
    return this.admin.deleteFaq(id);
  }
}
