import { Module } from '@nestjs/common';
import { SettlementReceiptController } from './settlement-receipt.controller';
import { SettlementReceiptService } from './settlement-receipt.service';

@Module({
  controllers: [SettlementReceiptController],
  providers: [SettlementReceiptService],
  exports: [SettlementReceiptService],
})
export class SettlementsModule {}
