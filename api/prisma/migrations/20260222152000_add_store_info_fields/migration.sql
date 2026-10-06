-- AlterTable
ALTER TABLE "merchant_profiles"
ADD COLUMN "estimated_delivery_min" INTEGER,
ADD COLUMN "estimated_delivery_max" INTEGER,
ADD COLUMN "discount_label" TEXT;
