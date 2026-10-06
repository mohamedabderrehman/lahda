import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CartService } from './cart.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('cart')
export class CartController {
  constructor(private cart: CartService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@CurrentUser() user: User) {
    return this.cart.list(user.id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  add(@CurrentUser() user: User, @Body() body: { productId: string; quantity?: number; optionsSnapshot?: object }) {
    return this.cart.add(user.id, body.productId, body.quantity ?? 1, body.optionsSnapshot);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@CurrentUser() user: User, @Param('id') id: string, @Body('quantity') quantity: number) {
    return this.cart.update(user, id, quantity);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.cart.remove(user, id);
  }

  @Delete()
  @UseGuards(AuthGuard('jwt'))
  clear(@CurrentUser() user: User) {
    return this.cart.clear(user.id);
  }
}
