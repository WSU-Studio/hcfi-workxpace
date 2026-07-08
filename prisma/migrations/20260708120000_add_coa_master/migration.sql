-- CreateTable
CREATE TABLE "coa_masters" (
    "id" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coa_masters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coa_masters_accountCode_key" ON "coa_masters"("accountCode");

-- CreateIndex
CREATE INDEX "coa_masters_accountCode_idx" ON "coa_masters"("accountCode");
