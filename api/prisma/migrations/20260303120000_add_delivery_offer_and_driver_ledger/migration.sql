-- CreateEnum: DeliveryOfferStatus
CREATE TYPE "DeliveryOfferStatus" AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- CreateTable: driver_ledger_entries
CREATE TABLE "driver_ledger_entries" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "order_id" TEXT,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "driver_ledger_entries_driver_id_created_at_idx" ON "driver_ledger_entries"("driver_id", "created_at");

ALTER TABLE "driver_ledger_entries" ADD CONSTRAINT "driver_ledger_entries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: order_delivery_offers
CREATE TABLE "order_delivery_offers" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "offered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "DeliveryOfferStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "order_delivery_offers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_delivery_offers_order_id_key" ON "order_delivery_offers"("order_id");
CREATE INDEX "order_delivery_offers_driver_id_status_idx" ON "order_delivery_offers"("driver_id", "status");
CREATE INDEX "order_delivery_offers_status_expires_at_idx" ON "order_delivery_offers"("status", "expires_at");

ALTER TABLE "order_delivery_offers" ADD CONSTRAINT "order_delivery_offers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_delivery_offers" ADD CONSTRAINT "order_delivery_offers_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
