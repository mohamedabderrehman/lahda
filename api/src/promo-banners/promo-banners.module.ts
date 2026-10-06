import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PromoBannersController } from './promo-banners.controller';
import { PromoBannersService } from './promo-banners.service';

@Module({
  imports: [PrismaModule],
  controllers: [PromoBannersController],
  providers: [PromoBannersService],
  exports: [PromoBannersService],
})
export class PromoBannersModule {}
