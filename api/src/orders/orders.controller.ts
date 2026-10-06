import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';
import { OrderStatus } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('customer')
  create(
    @CurrentUser() user: User,
    @Body()
    body: {
      addressId: string;
      paymentMethod: 'cash' | 'card' | 'wallet';
      notes?: string;
      promoCode?: string;
    },
  ) {
    return this.orders.create(user, body);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@CurrentUser() user: User, @Query('status') status?: string) {
    if (user.role === 'customer') return this.orders.listForCustomer(user);
    if (user.role === 'merchant') return this.orders.listForMerchant(user, status as OrderStatus | undefined);
    if (user.role === 'driver') return this.orders.listForDriver(user);
    return [];
  }

  @Get('pending-deliveries')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  listPendingDeliveries(@CurrentUser() user: User) {
    return this.orders.listPendingForDriver(user);
  }

  @Get('my-delivery-offer')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  getMyDeliveryOffer(@CurrentUser() user: User) {
    return this.orders.getMyDeliveryOffer(user);
  }

  @Post(':id/decline-delivery')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  declineDeliveryOffer(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.declineDeliveryOffer(user, id);
  }

  @Get(':id/driver-location')
  @UseGuards(AuthGuard('jwt'))
  getDriverLocation(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.getDriverLocation(id, user);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.getOne(id, user);
  }

  @Patch(':id/accept')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  merchantAccept(@CurrentUser() user: User, @Param('id') id: string, @Body('prepTimeMinutes') prepTimeMinutes?: number) {
    return this.orders.merchantAccept(user, id, prepTimeMinutes);
  }

  @Patch(':id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('merchant')
  merchantReject(@CurrentUser() user: User, @Param('id') id: string, @Body('notes') notes?: string) {
    return this.orders.merchantReject(user, id, notes);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Body('notes') notes?: string,
  ) {
    return this.orders.updateStatus(user, id, status, notes);
  }

  @Post(':id/take')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  driverTakeOrder(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.driverTakeOrder(user, id);
  }
}
