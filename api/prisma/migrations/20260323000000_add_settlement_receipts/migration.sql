-- CreateTable
CREATE TABLE "settlement_receipts" (
    "id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "party_type" TEXT NOT NULL,
    "party_id" TEXT NOT NULL,
    "party_name" TEXT NOT NULL,
    "party_phone" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "method" TEXT,
    "reference" TEXT,
    "issued_by_admin_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot_json" JSONB NOT NULL,
    "remittance_id" TEXT,
    "ledger_entry_id" TEXT,

    CONSTRAINT "settlement_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "settlement_receipts_receipt_number_key" ON "settlement_receipts"("receipt_number");
CREATE UNIQUE INDEX "settlement_receipts_remittance_id_key" ON "settlement_receipts"("remittance_id");
CREATE UNIQUE INDEX "settlement_receipts_ledger_entry_id_key" ON "settlement_receipts"("ledger_entry_id");
CREATE INDEX "settlement_receipts_party_type_party_id_idx" ON "settlement_receipts"("party_type", "party_id");
CREATE INDEX "settlement_receipts_issued_at_idx" ON "settlement_receipts"("issued_at");
