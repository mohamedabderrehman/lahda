import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { RewardChallengeController } from './reward-challenge.controller';
import { RewardChallengeService } from './reward-challenge.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [DriverController, RewardChallengeController],
  providers: [DriverService, RewardChallengeService],
})
export class DriverModule {}
