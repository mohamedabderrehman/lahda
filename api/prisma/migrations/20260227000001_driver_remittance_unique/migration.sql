-- Add unique constraint on driverId + date to prevent duplicate remittances
DROP INDEX IF EXISTS "driver_remittances_driver_id_date_idx";

CREATE UNIQUE INDEX "driver_remittances_driver_id_date_key" ON "driver_remittances"("driver_id", "date");
