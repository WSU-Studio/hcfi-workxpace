-- CreateTable
CREATE TABLE "data_mart_staging" (
    "id" TEXT NOT NULL,
    "reconciliation_saved_payment_id" TEXT NOT NULL,
    "confins_payment_doc_id" TEXT NOT NULL,
    "budget_request_id" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "budget_request_code" TEXT NOT NULL,
    "department_id" TEXT,
    "department_name" TEXT,
    "origin_office" TEXT,
    "division_name" TEXT,
    "requestor_name" TEXT,
    "incoming_reference_id" TEXT NOT NULL,
    "voucher_number" TEXT,
    "payment_description" TEXT,
    "payment_source" TEXT,
    "gl_account_code" TEXT,
    "gl_account_name" TEXT,
    "paid_amount" DECIMAL(18,2) NOT NULL,
    "expected_amount" DECIMAL(18,2) NOT NULL,
    "currency_code" TEXT,
    "business_role" TEXT,
    "activity_code" TEXT,
    "sub_activity_code" TEXT,
    "activity_label" TEXT,
    "sub_activity_label" TEXT,
    "vendor_name" TEXT,
    "interface_id" TEXT,
    "payment_request_no" TEXT,
    "confins_payload_raw" JSONB NOT NULL,
    "budget_request_snapshot" JSONB NOT NULL,
    "match_type" TEXT NOT NULL,
    "saved_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_mart_staging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_mart_staging_reconciliation_saved_payment_id_key" ON "data_mart_staging"("reconciliation_saved_payment_id");

-- CreateIndex
CREATE INDEX "data_mart_staging_fiscal_year_month_idx" ON "data_mart_staging"("fiscal_year", "month");

-- CreateIndex
CREATE INDEX "data_mart_staging_budget_request_id_idx" ON "data_mart_staging"("budget_request_id");

-- CreateIndex
CREATE INDEX "data_mart_staging_department_id_idx" ON "data_mart_staging"("department_id");

-- CreateIndex
CREATE INDEX "data_mart_staging_origin_office_idx" ON "data_mart_staging"("origin_office");

-- CreateIndex
CREATE INDEX "data_mart_staging_vendor_name_idx" ON "data_mart_staging"("vendor_name");

-- CreateIndex
CREATE INDEX "data_mart_staging_saved_at_idx" ON "data_mart_staging"("saved_at");

-- AddForeignKey
ALTER TABLE "data_mart_staging" ADD CONSTRAINT "data_mart_staging_reconciliation_saved_payment_id_fkey" FOREIGN KEY ("reconciliation_saved_payment_id") REFERENCES "reconciliation_saved_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_mart_staging" ADD CONSTRAINT "data_mart_staging_budget_request_id_fkey" FOREIGN KEY ("budget_request_id") REFERENCES "budget_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
