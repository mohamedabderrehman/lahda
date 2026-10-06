import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface RewardChallengeTier {
  trips: number;
  amount: number;
}

export interface RewardChallengeConfig {
  timeWindowMinutes: number;
  tiers: RewardChallengeTier[];
}

const DEFAULT_CONFIG: RewardChallengeConfig = {
  timeWindowMinutes: 300,
  tiers: [
    { trips: 5, amount: 500 },
    { trips: 7, amount: 800 },
    { trips: 15, amount: 1500 },
  ],
};

@Injectable()
export class RewardChallengeService {
  constructor(private prisma: PrismaService) {}

  private async getConfig(): Promise<RewardChallengeConfig> {
    const row = await this.prisma.appSettings.findFirst();
    const raw = row?.rewardChallengeConfig as RewardChallengeConfig | null | undefined;
    if (!raw || !raw.tiers || !Array.isArray(raw.tiers) || raw.tiers.length === 0) {
      return DEFAULT_CONFIG;
    }
    const timeWindowMinutes = typeof raw.timeWindowMinutes === 'number' ? raw.timeWindowMinutes : DEFAULT_CONFIG.timeWindowMinutes;
    const tiers = raw.tiers
      .filter((t: unknown) => t && typeof (t as { trips?: number }).trips === 'number' && typeof (t as { amount?: number }).amount === 'number')
      .map((t: { trips: number; amount: number }) => ({ trips: (t as { trips: number }).trips, amount: (t as { amount: number }).amount }))
      .sort((a: RewardChallengeTier, b: RewardChallengeTier) => a.trips - b.trips);
    return { timeWindowMinutes, tiers: tiers.length > 0 ? tiers : DEFAULT_CONFIG.tiers };
  }

  private toDateOnly(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  async getStatus(user: User) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Driver profile not found');

    const config = await this.getConfig();
    const now = new Date();
    const todayStr = this.toDateOnly(now);

    const todayChallenge = await this.prisma.driverRewardChallenge.findFirst({
      where: {
        driverId: profile.id,
        startedAt: {
          gte: new Date(todayStr + 'T00:00:00.000Z'),
          lt: new Date(new Date(todayStr).getTime() + 86400000),
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    const usedToday = !!todayChallenge;
    let challenge: {
      startedAt: string;
      timeRemainingSeconds: number;
      deliveriesCount: number;
      eligibleTier: number | null;
      canClaim: boolean;
    } | null = null;

    if (todayChallenge) {
      const startedAt = todayChallenge.startedAt;
      const endAt = new Date(startedAt.getTime() + config.timeWindowMinutes * 60 * 1000);
      const timeRemainingMs = endAt.getTime() - now.getTime();
      const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000));
      const timerEnded = timeRemainingMs <= 0;

      const deliveriesCount = await this.prisma.order.count({
        where: {
          driverId: user.id,
          status: 'delivered',
          deliveredAt: {
            gte: startedAt,
            lt: endAt,
          },
        },
      });

      let eligibleTier: number | null = null;
      for (let i = config.tiers.length - 1; i >= 0; i--) {
        if (deliveriesCount >= config.tiers[i].trips) {
          eligibleTier = i + 1;
          break;
        }
      }

      const canClaim = timerEnded && eligibleTier !== null && !todayChallenge.claimedAt;

      challenge = {
        startedAt: startedAt.toISOString(),
        timeRemainingSeconds,
        deliveriesCount,
        eligibleTier,
        canClaim,
      };
    }

    return {
      config: {
        timeWindowMinutes: config.timeWindowMinutes,
        tiers: config.tiers,
      },
      challenge,
      usedToday,
    };
  }

  async start(user: User) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Driver profile not found');

    const now = new Date();
    const todayStr = this.toDateOnly(now);

    const existing = await this.prisma.driverRewardChallenge.findFirst({
      where: {
        driverId: profile.id,
        startedAt: {
          gte: new Date(todayStr + 'T00:00:00.000Z'),
          lt: new Date(new Date(todayStr).getTime() + 86400000),
        },
      },
    });

    if (existing) {
      throw new BadRequestException('يمكنك بدء التحدي مرة واحدة فقط كل يوم');
    }

    const challenge = await this.prisma.driverRewardChallenge.create({
      data: { driverId: profile.id },
    });

    return {
      success: true,
      challenge: { startedAt: challenge.startedAt.toISOString() },
    };
  }

  async claim(user: User) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Driver profile not found');

    const config = await this.getConfig();
    const now = new Date();
    const todayStr = this.toDateOnly(now);

    const todayChallenge = await this.prisma.driverRewardChallenge.findFirst({
      where: {
        driverId: profile.id,
        startedAt: {
          gte: new Date(todayStr + 'T00:00:00.000Z'),
          lt: new Date(new Date(todayStr).getTime() + 86400000),
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!todayChallenge) {
      throw new BadRequestException('لا يوجد تحدي لليوم');
    }

    if (todayChallenge.claimedAt) {
      throw new BadRequestException('تم تحصيل المكافأة مسبقاً');
    }

    const startedAt = todayChallenge.startedAt;
    const endAt = new Date(startedAt.getTime() + config.timeWindowMinutes * 60 * 1000);

    if (now < endAt) {
      throw new BadRequestException('لم ينتهِ وقت التحدي بعد');
    }

    const deliveriesCount = await this.prisma.order.count({
      where: {
        driverId: user.id,
        status: 'delivered',
        deliveredAt: {
          gte: startedAt,
          lt: endAt,
        },
      },
    });

    let bestTierIndex = -1;
    for (let i = config.tiers.length - 1; i >= 0; i--) {
      if (deliveriesCount >= config.tiers[i].trips) {
        bestTierIndex = i;
        break;
      }
    }

    if (bestTierIndex < 0) {
      throw new BadRequestException('لم تحقق أي مستوى. لا مكافأة.');
    }

    const tier = config.tiers[bestTierIndex];
    const amount = new Decimal(tier.amount);

    await this.prisma.$transaction([
      this.prisma.driverLedgerEntry.create({
        data: {
          driverId: profile.id,
          amount,
          type: 'reward_challenge',
          note: `مكافأة التحدي - ${tier.trips} رحلات`,
        },
      }),
      this.prisma.driverRewardChallenge.update({
        where: { id: todayChallenge.id },
        data: {
          claimedTier: bestTierIndex + 1,
          claimedAmount: amount,
          claimedAt: now,
        },
      }),
    ]);

    return {
      success: true,
      claimedAmount: tier.amount,
      claimedTier: bestTierIndex + 1,
    };
  }
}
