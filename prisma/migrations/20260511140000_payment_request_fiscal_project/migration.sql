-- AlterTable
ALTER TABLE "payment_requests" ADD COLUMN     "fiscalYear" INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
ALTER TABLE "payment_requests" ADD COLUMN     "originOffice" TEXT;
ALTER TABLE "payment_requests" ADD COLUMN     "projectId" TEXT;

-- Drop default after backfill so new rows must set fiscalYear from app (optional cleanup)
ALTER TABLE "payment_requests" ALTER COLUMN "fiscalYear" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "payment_requests_projectId_idx" ON "payment_requests"("projectId");

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
