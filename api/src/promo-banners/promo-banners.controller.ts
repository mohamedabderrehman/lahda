import { Controller, Get } from '@nestjs/common';
import { PromoBannersService } from './promo-banners.service';

@Controller('promo-banners')
export class PromoBannersController {
  constructor(private promo: PromoBannersService) {}

  @Get()
  findAll() {
    return this.promo.findAllActive();
  }
}
