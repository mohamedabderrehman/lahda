import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AddressesService } from './addresses.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('addresses')
export class AddressesController {
  constructor(private addresses: AddressesService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  list(@CurrentUser() user: User) {
    return this.addresses.list(user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.addresses.getOne(user, id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@CurrentUser() user: User, @Body() body: Record<string, unknown>) {
    return this.addresses.create(user.id, body as never);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.addresses.update(user, id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  delete(@CurrentUser() user: User, @Param('id') id: string) {
    return this.addresses.delete(user, id);
  }
}
