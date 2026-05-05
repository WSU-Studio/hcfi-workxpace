ALTER TABLE "budget_requests"
  ADD COLUMN IF NOT EXISTS "categoryKeyIndex" TEXT,
  ADD COLUMN IF NOT EXISTS "costCenter" TEXT;
