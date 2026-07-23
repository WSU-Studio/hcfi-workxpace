-- CreateTable
CREATE TABLE IF NOT EXISTS "divisions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "divisions_code_key" ON "divisions"("code");

-- AlterTable
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "divisionId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "departments_divisionId_idx" ON "departments"("divisionId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'departments_divisionId_fkey'
  ) THEN
    ALTER TABLE "departments"
      ADD CONSTRAINT "departments_divisionId_fkey"
      FOREIGN KEY ("divisionId") REFERENCES "divisions"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
