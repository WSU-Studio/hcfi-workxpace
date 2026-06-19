-- CreateTable
CREATE TABLE "reconciliation_unused_payments" (
    "id" TEXT NOT NULL,
    "confins_payment_doc_id" TEXT NOT NULL,
    "interface_id" TEXT,
    "payment_request_no" TEXT,
    "journal_no" TEXT,
    "invoice_no" TEXT,
    "invoice_date" TEXT,
    "fiscal_year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "department_id" TEXT,
    "department_name" TEXT,
    "payment_source" TEXT,
    "paid_amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT,
    "gl_account_code" TEXT,
    "gl_account_name" TEXT,
    "vendor_name" TEXT,
    "description" TEXT,
    "reason" TEXT,
    "marked_by_user_id" TEXT NOT NULL,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reconciliation_unused_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reconciliation_unused_payments_confins_payment_doc_id_key" ON "reconciliation_unused_payments"("confins_payment_doc_id");

-- CreateIndex
CREATE INDEX "reconciliation_unused_payments_fiscal_year_month_idx" ON "reconciliation_unused_payments"("fiscal_year", "month");

-- CreateIndex
CREATE INDEX "reconciliation_unused_payments_department_id_idx" ON "reconciliation_unused_payments"("department_id");

-- CreateIndex
CREATE INDEX "reconciliation_unused_payments_marked_at_idx" ON "reconciliation_unused_payments"("marked_at");

-- AddForeignKey
ALTER TABLE "reconciliation_unused_payments" ADD CONSTRAINT "reconciliation_unused_payments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reconciliation_unused_payments" ADD CONSTRAINT "reconciliation_unused_payments_marked_by_user_id_fkey" FOREIGN KEY ("marked_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
