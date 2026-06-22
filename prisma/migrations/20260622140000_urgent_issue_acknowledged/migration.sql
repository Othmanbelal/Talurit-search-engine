-- Urgent issue resolution acknowledgement (sub-project B)
-- Additive nullable column; no backfill required.
ALTER TABLE "urgent_issues" ADD COLUMN "senderAcknowledgedAt" TIMESTAMP(3);
