-- Remove CoA relational dependency and old classification columns.
ALTER TABLE "budget_plans" DROP CONSTRAINT IF EXISTS "budget_plans_coaId_fkey";
DROP INDEX IF EXISTS "budget_plans_coaId_idx";

ALTER TABLE "budget_plans"
  DROP COLUMN IF EXISTS "category",
  DROP COLUMN IF EXISTS "coaSelectBy",
  ADD COLUMN IF NOT EXISTS "categoryId" TEXT,
  ADD COLUMN IF NOT EXISTS "costCenterId" TEXT;

CREATE INDEX IF NOT EXISTS "budget_plans_coaId_idx" ON "budget_plans"("coaId");
CREATE INDEX IF NOT EXISTS "budget_plans_categoryId_idx" ON "budget_plans"("categoryId");
CREATE INDEX IF NOT EXISTS "budget_plans_costCenterId_idx" ON "budget_plans"("costCenterId");

DROP TABLE IF EXISTS "coa_masters";

CREATE TABLE IF NOT EXISTS "category_masters" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "category_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_masters_name_key" ON "category_masters"("name");

CREATE TABLE IF NOT EXISTS "cost_center_masters" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cost_center_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cost_center_masters_name_key" ON "cost_center_masters"("name");

ALTER TABLE "budget_plans"
  ADD CONSTRAINT "budget_plans_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "category_masters"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budget_plans"
  ADD CONSTRAINT "budget_plans_costCenterId_fkey"
  FOREIGN KEY ("costCenterId") REFERENCES "cost_center_masters"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
