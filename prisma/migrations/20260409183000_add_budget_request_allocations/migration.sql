ALTER TABLE "budget_requests"
  ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(18,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "budget_request_allocations" (
  "id" TEXT NOT NULL,
  "budgetRequestId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "allocation" DECIMAL(18,2) NOT NULL,
  CONSTRAINT "budget_request_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "budget_request_allocations_budgetRequestId_year_month_key"
  ON "budget_request_allocations"("budgetRequestId", "year", "month");

CREATE INDEX IF NOT EXISTS "budget_request_allocations_budgetRequestId_idx"
  ON "budget_request_allocations"("budgetRequestId");

CREATE INDEX IF NOT EXISTS "budget_request_allocations_year_month_idx"
  ON "budget_request_allocations"("year", "month");

ALTER TABLE "budget_request_allocations"
  ADD CONSTRAINT "budget_request_allocations_budgetRequestId_fkey"
  FOREIGN KEY ("budgetRequestId") REFERENCES "budget_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
