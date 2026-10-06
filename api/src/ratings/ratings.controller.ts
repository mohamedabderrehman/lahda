import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RatingsService } from './ratings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';

@Controller('ratings')
export class RatingsController {
  constructor(private ratings: RatingsService) {}

  @Post('store')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('customer')
  rateStore(
    @CurrentUser() user: User,
    @Body() body: { orderId: string; stars: number; comment?: string },
  ) {
    return this.ratings.rateStore(user, body);
  }

  @Post('driver')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('customer')
  rateDriver(
    @CurrentUser() user: User,
    @Body() body: { orderId: string; stars: number; comment?: string },
  ) {
    return this.ratings.rateDriver(user, body);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listRatings(
    @CurrentUser() user: User,
    @Query('targetType') targetType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ratings.listRatings(user, {
      targetType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
