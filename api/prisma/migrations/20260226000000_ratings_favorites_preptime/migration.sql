-- AlterTable: add rating aggregates to driver_profiles
ALTER TABLE "driver_profiles" ADD COLUMN "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "driver_profiles" ADD COLUMN "rating_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: add prep_time_minutes, store_rated_at, driver_rated_at to orders
ALTER TABLE "orders" ADD COLUMN "prep_time_minutes" INTEGER;
ALTER TABLE "orders" ADD COLUMN "store_rated_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "driver_rated_at" TIMESTAMP(3);

-- CreateTable: ratings
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "rater_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ratings_order_id_target_type_key" ON "ratings"("order_id", "target_type");
CREATE INDEX "ratings_target_type_target_id_created_at_idx" ON "ratings"("target_type", "target_id", "created_at");

ALTER TABLE "ratings" ADD CONSTRAINT "ratings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: favorites
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorites_user_id_target_type_target_id_key" ON "favorites"("user_id", "target_type", "target_id");
CREATE INDEX "favorites_user_id_target_type_idx" ON "favorites"("user_id", "target_type");
