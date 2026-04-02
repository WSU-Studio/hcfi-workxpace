CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'info',
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
