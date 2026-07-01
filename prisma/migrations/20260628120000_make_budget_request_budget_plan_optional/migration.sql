-- AlterTable
ALTER TABLE "budget_requests" DROP CONSTRAINT "budget_requests_budgetPlanId_fkey";

ALTER TABLE "budget_requests" ALTER COLUMN "budgetPlanId" DROP NOT NULL;

ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_budgetPlanId_fkey" FOREIGN KEY ("budgetPlanId") REFERENCES "budget_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
