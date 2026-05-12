-- CreateTable
CREATE TABLE "reconciliation_saved_payments" (
    "id" TEXT NOT NULL,
    "confins_payment_doc_id" TEXT NOT NULL,
    "budget_request_id" TEXT NOT NULL,
    "matchType" TEXT NOT NULL,
    "incoming_reference_id" TEXT NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL,
    "expected_amount" DECIMAL(18,2) NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "department_id" TEXT,
    "voucher_number" TEXT,
    "payment_description" TEXT,
    "payment_source" TEXT,
    "gl_account_code" TEXT,
    "gl_account_name" TEXT,
    "saved_by_user_id" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_saved_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_saved_payments_confins_payment_doc_id_key" ON "reconciliation_saved_payments"("confins_payment_doc_id");

-- CreateIndex
CREATE INDEX "reconciliation_saved_payments_fiscal_year_month_idx" ON "reconciliation_saved_payments"("fiscal_year", "month");

-- CreateIndex
CREATE INDEX "reconciliation_saved_payments_budget_request_id_idx" ON "reconciliation_saved_payments"("budget_request_id");

-- CreateIndex
CREATE INDEX "reconciliation_saved_payments_saved_at_idx" ON "reconciliation_saved_payments"("saved_at");

-- AddForeignKey
ALTER TABLE "reconciliation_saved_payments" ADD CONSTRAINT "reconciliation_saved_payments_budget_request_id_fkey" FOREIGN KEY ("budget_request_id") REFERENCES "budget_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_saved_payments" ADD CONSTRAINT "reconciliation_saved_payments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_saved_payments" ADD CONSTRAINT "reconciliation_saved_payments_saved_by_user_id_fkey" FOREIGN KEY ("saved_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
