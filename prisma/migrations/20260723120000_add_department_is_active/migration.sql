-- AlterTable
ALTER TABLE "departments" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "departments_isActive_idx" ON "departments"("isActive");
