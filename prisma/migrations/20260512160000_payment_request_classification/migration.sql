ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "categoryKeyIndex" TEXT;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "costCenter" TEXT;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "coa" TEXT;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "opexAllocation" TEXT;
ALTER TABLE "payment_requests" ADD COLUMN IF NOT EXISTS "opexType" TEXT;
