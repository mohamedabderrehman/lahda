import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ProductsModule } from './products/products.module';
import { AddressesModule } from './addresses/addresses.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { DriverModule } from './driver/driver.module';
import { AdminModule } from './admin/admin.module';
import { FaqModule } from './faq/faq.module';
import { SettingsModule } from './settings/settings.module';
import { PromoBannersModule } from './promo-banners/promo-banners.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { HomeModule } from './home/home.module';
import { SupportChannelsModule } from './support-channels/support-channels.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RatingsModule } from './ratings/ratings.module';
import { FavoritesModule } from './favorites/favorites.module';
import { SettlementsModule } from './settlements/settlements.module';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    HomeModule,
    AuthModule,
    CategoriesModule,
    MerchantsModule,
    ProductsModule,
    AddressesModule,
    CartModule,
    OrdersModule,
    DriverModule,
    AdminModule,
    FaqModule,
    SettingsModule,
    PromoBannersModule,
    PromoCodesModule,
    SupportChannelsModule,
    NotificationsModule,
    RatingsModule,
    FavoritesModule,
    SettlementsModule,
  ],
  controllers: [AppController],
  providers: [AppService, RolesGuard],
})
export class AppModule {}
