import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FavoritesService } from './favorites.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('favorites')
@UseGuards(AuthGuard('jwt'))
export class FavoritesController {
  constructor(private favs: FavoritesService) {}

  @Post('toggle')
  toggle(
    @CurrentUser() user: User,
    @Body() body: { targetType: string; targetId: string },
  ) {
    return this.favs.toggle(user, body.targetType, body.targetId);
  }

  @Get()
  list(@CurrentUser() user: User, @Query('type') type?: string) {
    return this.favs.list(user, type);
  }

  @Get('ids')
  getIds(@CurrentUser() user: User) {
    return this.favs.getIds(user);
  }
}
