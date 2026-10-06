import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DriverService } from './driver.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';

@Controller('driver')
export class DriverController {
  constructor(private driver: DriverService) {}

  @Get('profile')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  getProfile(@CurrentUser() user: User) {
    return this.driver.getProfile(user);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  updateProfile(@CurrentUser() user: User, @Body() body: { nationalId?: string; vehicleInfo?: string }) {
    return this.driver.updateProfile(user, body);
  }

  @Post('online')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  setOnline(@CurrentUser() user: User, @Body('isOnline') isOnline: boolean) {
    return this.driver.setOnline(user, isOnline);
  }

  @Post('location')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  updateLocation(@CurrentUser() user: User, @Body('latitude') lat: number, @Body('longitude') lng: number) {
    return this.driver.updateLocation(user, lat, lng);
  }

  @Get('earnings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('driver')
  getEarnings(@CurrentUser() user: User) {
    return this.driver.getEarnings(user);
  }
}
