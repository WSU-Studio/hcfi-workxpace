CREATE TABLE IF NOT EXISTS "origin_office_masters" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "officeType" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "origin_office_masters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "origin_office_masters_code_key" ON "origin_office_masters"("code");
CREATE INDEX IF NOT EXISTS "origin_office_masters_name_idx" ON "origin_office_masters"("name");
