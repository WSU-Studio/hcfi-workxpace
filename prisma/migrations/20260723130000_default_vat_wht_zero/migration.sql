-- AlterTable
ALTER TABLE "budget_requests" ALTER COLUMN "vatPercent" SET DEFAULT 0;
ALTER TABLE "budget_requests" ALTER COLUMN "whtPercent" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "payment_requests" ALTER COLUMN "vatPercent" SET DEFAULT 0;
ALTER TABLE "payment_requests" ALTER COLUMN "whtPercent" SET DEFAULT 0;
