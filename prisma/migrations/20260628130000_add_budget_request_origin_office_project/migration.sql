-- AlterTable
ALTER TABLE "budget_requests" ADD COLUMN "originOffice" TEXT;
ALTER TABLE "budget_requests" ADD COLUMN "projectId" TEXT;

CREATE INDEX "budget_requests_projectId_idx" ON "budget_requests"("projectId");

ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
