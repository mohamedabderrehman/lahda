-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN "reward_challenge_config" JSONB;

-- CreateTable
CREATE TABLE "driver_reward_challenges" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_tier" INTEGER,
    "claimed_amount" DECIMAL(10,2),
    "claimed_at" TIMESTAMP(3),

    CONSTRAINT "driver_reward_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "driver_reward_challenges_driver_id_started_at_idx" ON "driver_reward_challenges"("driver_id", "started_at");

ALTER TABLE "driver_reward_challenges" ADD CONSTRAINT "driver_reward_challenges_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
