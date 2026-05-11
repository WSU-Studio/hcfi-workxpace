-- CreateTable
CREATE TABLE "payment_requests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "budgetRequestId" TEXT,
    "requestorId" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "payeeName" TEXT NOT NULL,
    "paymentPurpose" TEXT,
    "notes" TEXT,
    "supportingDocs" JSONB,
    "approvalSchemaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_requests_code_key" ON "payment_requests"("code");

-- CreateIndex
CREATE INDEX "payment_requests_departmentId_idx" ON "payment_requests"("departmentId");

-- CreateIndex
CREATE INDEX "payment_requests_budgetRequestId_idx" ON "payment_requests"("budgetRequestId");

-- CreateIndex
CREATE INDEX "payment_requests_status_idx" ON "payment_requests"("status");

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_budgetRequestId_fkey" FOREIGN KEY ("budgetRequestId") REFERENCES "budget_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_approvalSchemaId_fkey" FOREIGN KEY ("approvalSchemaId") REFERENCES "approval_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
