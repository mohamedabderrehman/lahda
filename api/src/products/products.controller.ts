import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductsService } from './products.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';

@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.products.search(q, {
      categoryId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('store/:storeSlug')
  listByStore(@Param('storeSlug') storeSlug: string) {
    return this.products.listByStore(storeSlug);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  create(@CurrentUser() user: User, @Body() body: { merchantProfileId: string; productCategoryId?: string; nameAr: string; nameEn?: string; description?: string; price: number; imageUrl?: string }) {
    return this.products.create(user, body.merchantProfileId, body);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.products.update(user, id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.products.delete(user, id);
  }

  @Get('me/categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  listMyCategories(@CurrentUser() user: User) {
    return this.products.listMyCategories(user);
  }

  @Post('me/categories')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  createMyCategory(
    @CurrentUser() user: User,
    @Body() body: { nameAr: string; nameEn?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.products.createMyCategory(user, body);
  }

  @Patch('me/categories/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  updateMyCategory(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: { nameAr?: string; nameEn?: string; sortOrder?: number; isActive?: boolean },
  ) {
    return this.products.updateMyCategory(user, id, body);
  }

  @Delete('me/categories/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  deleteMyCategory(@CurrentUser() user: User, @Param('id') id: string) {
    return this.products.deleteMyCategory(user, id);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.products.getOne(id);
  }

  // ── ProductOption CRUD ──

  @Get(':productId/options')
  listOptions(@Param('productId') productId: string) {
    return this.products.listOptions(productId);
  }

  @Post(':productId/options')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  createOption(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Body() body: { name: string; priceModifier: number },
  ) {
    return this.products.createOption(user, productId, body);
  }

  @Patch('options/:optionId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  updateOption(
    @CurrentUser() user: User,
    @Param('optionId') optionId: string,
    @Body() body: { name?: string; priceModifier?: number },
  ) {
    return this.products.updateOption(user, optionId, body);
  }

  @Delete('options/:optionId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  deleteOption(
    @CurrentUser() user: User,
    @Param('optionId') optionId: string,
  ) {
    return this.products.deleteOption(user, optionId);
  }
}
