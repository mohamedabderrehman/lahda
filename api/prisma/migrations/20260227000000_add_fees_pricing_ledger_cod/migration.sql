-- CreateEnum: CodStatus
CREATE TYPE "CodStatus" AS ENUM ('due_to_admin', 'in_remittance', 'remitted_confirmed');

-- CreateEnum: RemittanceStatus
CREATE TYPE "RemittanceStatus" AS ENUM ('draft', 'submitted', 'confirmed');

-- AlterTable: add pricing fields to app_settings
ALTER TABLE "app_settings" ADD COLUMN "pricing_config" JSONB;

-- AlterTable: add pricing and COD fields to orders
ALTER TABLE "orders" ADD COLUMN "app_fee" DECIMAL(10, 2) NOT NULL DEFAULT 0;
ALTER TABLE "orders" ADD COLUMN "distance_km" DECIMAL(10, 2);
ALTER TABLE "orders" ADD COLUMN "pricing_snapshot" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "orders" ADD COLUMN "cod_status" "CodStatus";
ALTER TABLE "orders" ADD COLUMN "cod_confirmed_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "cod_confirmed_by_admin_id" TEXT;

-- CreateTable: merchant_ledger_entries
CREATE TABLE "merchant_ledger_entries" (
    "id" TEXT NOT NULL,
    "merchant_profile_id" TEXT NOT NULL,
    "order_id" TEXT,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_ledger_entries_order_id_type_key" ON "merchant_ledger_entries"("order_id", "type");
CREATE INDEX "merchant_ledger_entries_merchant_profile_id_created_at_idx" ON "merchant_ledger_entries"("merchant_profile_id", "created_at");

ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_merchant_profile_id_fkey" FOREIGN KEY ("merchant_profile_id") REFERENCES "merchant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: driver_remittances
CREATE TABLE "driver_remittances" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "RemittanceStatus" NOT NULL DEFAULT 'draft',
    "orders_count" INTEGER NOT NULL,
    "subtotal_sum" DECIMAL(10, 2) NOT NULL,
    "app_fee_sum" DECIMAL(10, 2) NOT NULL,
    "delivery_fee_sum" DECIMAL(10, 2) NOT NULL,
    "amount_due_to_admin" DECIMAL(10, 2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "confirmed_by_admin_id" TEXT,

    CONSTRAINT "driver_remittances_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "driver_remittances_driver_id_date_idx" ON "driver_remittances"("driver_id", "date");
CREATE INDEX "driver_remittances_status_idx" ON "driver_remittances"("status");

ALTER TABLE "driver_remittances" ADD CONSTRAINT "driver_remittances_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: driver_remittance_orders
CREATE TABLE "driver_remittance_orders" (
    "id" TEXT NOT NULL,
    "remittance_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,

    CONSTRAINT "driver_remittance_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "driver_remittance_orders_order_id_key" ON "driver_remittance_orders"("order_id");
CREATE UNIQUE INDEX "driver_remittance_orders_remittance_id_order_id_key" ON "driver_remittance_orders"("remittance_id", "order_id");

ALTER TABLE "driver_remittance_orders" ADD CONSTRAINT "driver_remittance_orders_remittance_id_fkey" FOREIGN KEY ("remittance_id") REFERENCES "driver_remittances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "driver_remittance_orders" ADD CONSTRAINT "driver_remittance_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
