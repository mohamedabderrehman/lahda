import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface PricingBand {
  minKm: number;
  maxKm: number | null;
  fee: number;
}

export interface PricingConfig {
  appFee: {
    threshold: number;
    belowThreshold: number;
    aboveThreshold: number;
  };
  distanceBands: PricingBand[];
}

export interface RewardChallengeTier {
  trips: number;
  amount: number;
}

export interface RewardChallengeConfig {
  timeWindowMinutes: number;
  tiers: RewardChallengeTier[];
}

const DEFAULT_REWARD_CHALLENGE_CONFIG: RewardChallengeConfig = {
  timeWindowMinutes: 300,
  tiers: [
    { trips: 5, amount: 500 },
    { trips: 7, amount: 800 },
    { trips: 15, amount: 1500 },
  ],
};

const DEFAULT_PRICING_CONFIG: PricingConfig = {
  appFee: {
    threshold: 15000,
    belowThreshold: 250,
    aboveThreshold: 500,
  },
  distanceBands: [
    { minKm: 0, maxKm: 5, fee: 1000 },
    { minKm: 5, maxKm: 7, fee: 1500 },
    { minKm: 7, maxKm: 10, fee: 2000 },
    { minKm: 10, maxKm: null, fee: 2500 },
  ],
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let row = await this.prisma.appSettings.findFirst();
    if (!row) {
      row = await this.prisma.appSettings.create({
        data: {
          appNameAr: 'لحظة',
          appNameEn: 'Lahda',
          pricingConfig: DEFAULT_PRICING_CONFIG as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return {
      appLogoUrl: row.appLogoUrl,
      appNameAr: row.appNameAr ?? 'لحظة',
      appNameEn: row.appNameEn ?? 'Lahda',
      pricingConfig: (row.pricingConfig as unknown as PricingConfig) || DEFAULT_PRICING_CONFIG,
      rewardChallengeConfig:
        (row.rewardChallengeConfig as unknown as RewardChallengeConfig) || DEFAULT_REWARD_CHALLENGE_CONFIG,
    };
  }

  async getPricingConfig(): Promise<PricingConfig> {
    const settings = await this.getSettings();
    return settings.pricingConfig || DEFAULT_PRICING_CONFIG;
  }

  async updateSettings(data: {
    appLogoUrl?: string;
    appNameAr?: string;
    appNameEn?: string;
    pricingConfig?: PricingConfig;
    rewardChallengeConfig?: RewardChallengeConfig;
  }) {
    // Validate pricing config if provided
    if (data.pricingConfig) {
      this.validatePricingConfig(data.pricingConfig);
    }

    // Validate reward challenge config if provided
    if (data.rewardChallengeConfig) {
      this.validateRewardChallengeConfig(data.rewardChallengeConfig);
    }

    // Normalize: ensure distanceBands are always sorted before saving
    let normalizedConfig: PricingConfig | undefined = data.pricingConfig;
    if (normalizedConfig?.distanceBands) {
      normalizedConfig = {
        ...normalizedConfig,
        distanceBands: [...normalizedConfig.distanceBands].sort((a, b) => a.minKm - b.minKm),
      };
    }

    let normalizedReward: RewardChallengeConfig | undefined = data.rewardChallengeConfig;

    let row = await this.prisma.appSettings.findFirst();
    if (!row) {
      row = await this.prisma.appSettings.create({
        data: {
          appLogoUrl: data.appLogoUrl,
          appNameAr: data.appNameAr ?? 'لحظة',
          appNameEn: data.appNameEn ?? 'Lahda',
          pricingConfig: (normalizedConfig || DEFAULT_PRICING_CONFIG) as unknown as Prisma.InputJsonValue,
          rewardChallengeConfig: (normalizedReward || DEFAULT_REWARD_CHALLENGE_CONFIG) as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      const updateData: {
        appLogoUrl?: string;
        appNameAr?: string;
        appNameEn?: string;
        pricingConfig?: Prisma.InputJsonValue;
        rewardChallengeConfig?: Prisma.InputJsonValue;
      } = {
        appLogoUrl: data.appLogoUrl,
        appNameAr: data.appNameAr,
        appNameEn: data.appNameEn,
      };
      if (normalizedConfig !== undefined) {
        updateData.pricingConfig = normalizedConfig as unknown as Prisma.InputJsonValue;
      }
      if (normalizedReward !== undefined) {
        updateData.rewardChallengeConfig = normalizedReward as unknown as Prisma.InputJsonValue;
      }
      row = await this.prisma.appSettings.update({
        where: { id: row.id },
        data: updateData,
      });
    }
    return {
      appLogoUrl: row.appLogoUrl,
      appNameAr: row.appNameAr,
      appNameEn: row.appNameEn,
      pricingConfig: (row.pricingConfig as unknown as PricingConfig) || DEFAULT_PRICING_CONFIG,
      rewardChallengeConfig:
        (row.rewardChallengeConfig as unknown as RewardChallengeConfig) || DEFAULT_REWARD_CHALLENGE_CONFIG,
    };
  }

  private validatePricingConfig(config: PricingConfig) {
    // Validate app fee structure
    if (!config.appFee || typeof config.appFee.threshold !== 'number' || config.appFee.threshold <= 0) {
      throw new BadRequestException('Invalid app fee threshold');
    }
    if (typeof config.appFee.belowThreshold !== 'number' || config.appFee.belowThreshold < 0) {
      throw new BadRequestException('Invalid below-threshold app fee');
    }
    if (typeof config.appFee.aboveThreshold !== 'number' || config.appFee.aboveThreshold < 0) {
      throw new BadRequestException('Invalid above-threshold app fee');
    }

    // Validate distance bands
    if (!Array.isArray(config.distanceBands) || config.distanceBands.length === 0) {
      throw new BadRequestException('Distance bands must be a non-empty array');
    }

    // Sort bands by minKm
    const sortedBands = [...config.distanceBands].sort((a, b) => a.minKm - b.minKm);

    for (let i = 0; i < sortedBands.length; i++) {
      const band = sortedBands[i];

      // Validate band structure
      if (typeof band.minKm !== 'number' || band.minKm < 0) {
        throw new BadRequestException(`Invalid minKm for band ${i}`);
      }
      if (band.maxKm !== null && (typeof band.maxKm !== 'number' || band.maxKm <= band.minKm)) {
        throw new BadRequestException(`Invalid maxKm for band ${i} (must be > minKm or null)`);
      }
      if (typeof band.fee !== 'number' || band.fee < 0) {
        throw new BadRequestException(`Invalid fee for band ${i}`);
      }

      // Check for gaps between bands (except the last one which can be open-ended)
      if (i < sortedBands.length - 1) {
        const nextBand = sortedBands[i + 1];
        if (band.maxKm !== nextBand.minKm) {
          throw new BadRequestException(
            `Gap or overlap between band ${i} and ${i + 1}: ${band.maxKm} vs ${nextBand.minKm}`,
          );
        }
      }

      // Last band must have null maxKm (open-ended)
      if (i === sortedBands.length - 1 && band.maxKm !== null) {
        throw new BadRequestException('Last distance band must have null maxKm (open-ended)');
      }
    }

    // Ensure bands start from 0
    if (sortedBands[0].minKm !== 0) {
      throw new BadRequestException('First distance band must start from 0 km');
    }
  }

  private validateRewardChallengeConfig(config: RewardChallengeConfig) {
    if (typeof config.timeWindowMinutes !== 'number' || config.timeWindowMinutes <= 0) {
      throw new BadRequestException('Invalid time window');
    }
    if (!Array.isArray(config.tiers) || config.tiers.length < 1 || config.tiers.length > 10) {
      throw new BadRequestException('Tiers must be 1-10 entries');
    }
    const sorted = [...config.tiers].sort((a, b) => a.trips - b.trips);
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      if (typeof t.trips !== 'number' || t.trips < 1) {
        throw new BadRequestException(`Invalid trips for tier ${i + 1}`);
      }
      if (typeof t.amount !== 'number' || t.amount < 0) {
        throw new BadRequestException(`Invalid amount for tier ${i + 1}`);
      }
      if (i > 0 && t.trips <= sorted[i - 1].trips) {
        throw new BadRequestException(`Tier ${i + 1} trips must be greater than previous`);
      }
    }
  }

  /**
   * Calculate delivery fee based on distance using configured bands
   * Bands are always sorted by minKm to ensure deterministic results
   */
  calculateDeliveryFee(distanceKm: number, bands: PricingBand[]): number {
    // Ensure deterministic order regardless of input order
    const sortedBands = [...bands].sort((a, b) => a.minKm - b.minKm);
    for (const band of sortedBands) {
      if (band.maxKm === null) {
        // Open-ended band (last one)
        if (distanceKm >= band.minKm) {
          return band.fee;
        }
      } else {
        // Regular band: [min, max)
        if (distanceKm >= band.minKm && distanceKm < band.maxKm) {
          return band.fee;
        }
      }
    }
    // Fallback to highest fee if no band matches (shouldn't happen if bands are configured correctly)
    return sortedBands[sortedBands.length - 1]?.fee || 2500;
  }

  /**
   * Calculate app fee based on subtotal
   */
  calculateAppFee(subtotal: number, appFeeConfig: PricingConfig['appFee']): number {
    return subtotal < appFeeConfig.threshold ? appFeeConfig.belowThreshold : appFeeConfig.aboveThreshold;
  }
}
