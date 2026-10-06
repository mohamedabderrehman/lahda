import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CategoriesModule } from '../categories/categories.module';
import { SettingsModule } from '../settings/settings.module';
import { PromoBannersModule } from '../promo-banners/promo-banners.module';
import { SupportChannelsModule } from '../support-channels/support-channels.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, CategoriesModule, SettingsModule, PromoBannersModule, SupportChannelsModule, MerchantsModule, OrdersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
