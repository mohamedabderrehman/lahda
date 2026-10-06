import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { MerchantLedgerController } from './merchant-ledger.controller';
import { MerchantLedgerService } from './merchant-ledger.service';
import { PromoCodesModule } from '../promo-codes/promo-codes.module';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [PromoCodesModule, SettlementsModule],
  controllers: [MerchantsController, MerchantLedgerController],
  providers: [MerchantsService, MerchantLedgerService],
  exports: [MerchantsService, MerchantLedgerService],
})
export class MerchantsModule {}
