-- Enforce at most one pending request per borrow record at the database level.
-- The application check in requestBorrow remains for a friendly error message;
-- this index is the race-proof backstop (two truly concurrent requests cannot
-- both commit a pending row).
-- NOTE: partial unique indexes cannot be modeled in schema.prisma, so this
-- index exists only in migration history. See the comment on the BorrowRequest
-- model in schema.prisma before running destructive schema diffs.
CREATE UNIQUE INDEX "borrow_requests_one_pending_per_record"
ON "borrow_requests"("borrowRecordId")
WHERE "status" = 'pending';
