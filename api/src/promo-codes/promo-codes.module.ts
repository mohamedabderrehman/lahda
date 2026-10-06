import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PromoCodesService } from './promo-codes.service';
import { AdminPromoCodesController, PromoCodesController } from './promo-codes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PromoCodesController, AdminPromoCodesController],
  providers: [PromoCodesService],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}

