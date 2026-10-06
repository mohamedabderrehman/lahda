import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CodRemittanceController } from './cod-remittance.controller';
import { CodRemittanceService } from './cod-remittance.service';
import { DeliveryOfferService } from './delivery-offer.service';
import { SettingsModule } from '../settings/settings.module';
import { SettlementsModule } from '../settlements/settlements.module';
import { PromoCodesService } from '../promo-codes/promo-codes.service';

@Module({
  imports: [SettingsModule, SettlementsModule],
  controllers: [OrdersController, CodRemittanceController],
  providers: [OrdersService, CodRemittanceService, DeliveryOfferService, PromoCodesService],
  exports: [OrdersService, CodRemittanceService, DeliveryOfferService],
})
export class OrdersModule {}
