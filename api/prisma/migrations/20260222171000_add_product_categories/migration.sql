CREATE TABLE "product_categories" (
  "id" TEXT NOT NULL,
  "merchant_profile_id" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "name_en" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "products"
ADD COLUMN "product_category_id" TEXT;

ALTER TABLE "product_categories"
ADD CONSTRAINT "product_categories_merchant_profile_id_fkey"
FOREIGN KEY ("merchant_profile_id")
REFERENCES "merchant_profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
ADD CONSTRAINT "products_product_category_id_fkey"
FOREIGN KEY ("product_category_id")
REFERENCES "product_categories"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "product_categories_merchant_profile_id_sort_order_idx"
ON "product_categories"("merchant_profile_id", "sort_order");
