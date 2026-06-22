ALTER TABLE "backup_logs"
ADD COLUMN "operation" TEXT NOT NULL DEFAULT 'backup',
ADD COLUMN "trigger" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "completedAt" TIMESTAMP(3);

CREATE INDEX "backup_logs_operation_idx" ON "backup_logs"("operation");
CREATE INDEX "backup_logs_trigger_idx" ON "backup_logs"("trigger");
CREATE INDEX "backup_logs_createdByUserId_idx" ON "backup_logs"("createdByUserId");

ALTER TABLE "backup_logs"
ADD CONSTRAINT "backup_logs_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
