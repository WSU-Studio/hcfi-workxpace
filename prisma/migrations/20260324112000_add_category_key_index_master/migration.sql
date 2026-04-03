ALTER TABLE "budget_plans"
  ADD COLUMN IF NOT EXISTS "categoryKeyIndexId" TEXT;

CREATE INDEX IF NOT EXISTS "budget_plans_categoryKeyIndexId_idx" ON "budget_plans"("categoryKeyIndexId");

CREATE TABLE IF NOT EXISTS "category_key_index_masters" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "category_key_index_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_key_index_masters_name_key" ON "category_key_index_masters"("name");

ALTER TABLE "budget_plans"
  ADD CONSTRAINT "budget_plans_categoryKeyIndexId_fkey"
  FOREIGN KEY ("categoryKeyIndexId") REFERENCES "category_key_index_masters"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
