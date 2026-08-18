-- Optional Specific PIC subset per approval-schema level.
-- Zero rows for a level means every user holding that level's role is eligible.
CREATE TABLE "approval_level_pics" (
    "id" TEXT NOT NULL,
    "approvalLevelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_level_pics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approval_level_pics_approvalLevelId_userId_key" ON "approval_level_pics"("approvalLevelId", "userId");
CREATE INDEX "approval_level_pics_approvalLevelId_idx" ON "approval_level_pics"("approvalLevelId");
CREATE INDEX "approval_level_pics_userId_idx" ON "approval_level_pics"("userId");

ALTER TABLE "approval_level_pics" ADD CONSTRAINT "approval_level_pics_approvalLevelId_fkey" FOREIGN KEY ("approvalLevelId") REFERENCES "approval_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_level_pics" ADD CONSTRAINT "approval_level_pics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
