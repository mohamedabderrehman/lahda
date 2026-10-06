import { Controller, Get, Query } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private home: HomeService) {}

  @Get()
  getHome(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const latNum = lat ? parseFloat(lat) : undefined;
    const lngNum = lng ? parseFloat(lng) : undefined;
    return this.home.getHome(latNum, lngNum);
  }
}
