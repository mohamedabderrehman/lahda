import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RewardChallengeService } from './reward-challenge.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { User } from '@prisma/client';

@Controller('driver/reward-challenge')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('driver')
export class RewardChallengeController {
  constructor(private rewardChallenge: RewardChallengeService) {}

  @Get('status')
  getStatus(@CurrentUser() user: User) {
    return this.rewardChallenge.getStatus(user);
  }

  @Post('start')
  start(@CurrentUser() user: User) {
    return this.rewardChallenge.start(user);
  }

  @Post('claim')
  claim(@CurrentUser() user: User) {
    return this.rewardChallenge.claim(user);
  }
}
