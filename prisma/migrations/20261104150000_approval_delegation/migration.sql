-- Temporary user→user approval substitute (delegator fully replaced by delegate while Active).
CREATE TABLE "approval_delegations" (
    "id" TEXT NOT NULL,
    "delegatorUserId" TEXT NOT NULL,
    "delegateUserId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_delegations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "approval_delegations_delegatorUserId_startDate_endDate_idx" ON "approval_delegations"("delegatorUserId", "startDate", "endDate");
CREATE INDEX "approval_delegations_delegateUserId_startDate_endDate_idx" ON "approval_delegations"("delegateUserId", "startDate", "endDate");
CREATE INDEX "approval_delegations_status_idx" ON "approval_delegations"("status");

ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegatorUserId_fkey" FOREIGN KEY ("delegatorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "approval_delegations" ADD CONSTRAINT "approval_delegations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
