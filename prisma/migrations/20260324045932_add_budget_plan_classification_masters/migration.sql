-- AlterTable
ALTER TABLE "budget_plans" ADD COLUMN     "category" TEXT,
ADD COLUMN     "coaId" TEXT,
ADD COLUMN     "coaSelectBy" TEXT,
ADD COLUMN     "opexAllocationId" TEXT,
ADD COLUMN     "opexId" TEXT,
ADD COLUMN     "opexType" TEXT;

-- CreateTable
CREATE TABLE "coa_masters" (
    "id" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "costCenter" TEXT,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coa_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opex_masters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opex_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opex_allocation_masters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opex_allocation_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coa_masters_accountCode_idx" ON "coa_masters"("accountCode");

-- CreateIndex
CREATE INDEX "coa_masters_costCenter_idx" ON "coa_masters"("costCenter");

-- CreateIndex
CREATE INDEX "coa_masters_category_idx" ON "coa_masters"("category");

-- CreateIndex
CREATE UNIQUE INDEX "opex_masters_name_key" ON "opex_masters"("name");

-- CreateIndex
CREATE UNIQUE INDEX "opex_allocation_masters_name_key" ON "opex_allocation_masters"("name");

-- CreateIndex
CREATE INDEX "budget_plans_coaId_idx" ON "budget_plans"("coaId");

-- CreateIndex
CREATE INDEX "budget_plans_opexId_idx" ON "budget_plans"("opexId");

-- CreateIndex
CREATE INDEX "budget_plans_opexAllocationId_idx" ON "budget_plans"("opexAllocationId");

-- AddForeignKey
ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_approvalSchemaId_fkey" FOREIGN KEY ("approvalSchemaId") REFERENCES "approval_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_coaId_fkey" FOREIGN KEY ("coaId") REFERENCES "coa_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_opexId_fkey" FOREIGN KEY ("opexId") REFERENCES "opex_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_plans" ADD CONSTRAINT "budget_plans_opexAllocationId_fkey" FOREIGN KEY ("opexAllocationId") REFERENCES "opex_allocation_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_requests" ADD CONSTRAINT "budget_requests_approvalSchemaId_fkey" FOREIGN KEY ("approvalSchemaId") REFERENCES "approval_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
