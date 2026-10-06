-- Create admin-managed home sections
CREATE TABLE "home_sections" (
  "id" TEXT NOT NULL,
  "title_ar" TEXT NOT NULL,
  "title_en" TEXT,
  "slug" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "home_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "home_sections_slug_key" ON "home_sections"("slug");

CREATE TABLE "home_section_merchants" (
  "id" TEXT NOT NULL,
  "home_section_id" TEXT NOT NULL,
  "merchant_profile_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "home_section_merchants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "home_section_merchants_home_section_id_merchant_profile_id_key"
ON "home_section_merchants"("home_section_id", "merchant_profile_id");

ALTER TABLE "home_section_merchants"
ADD CONSTRAINT "home_section_merchants_home_section_id_fkey"
FOREIGN KEY ("home_section_id")
REFERENCES "home_sections"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "home_section_merchants"
ADD CONSTRAINT "home_section_merchants_merchant_profile_id_fkey"
FOREIGN KEY ("merchant_profile_id")
REFERENCES "merchant_profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
