-- Fix authorId nullable on item_notes
ALTER TABLE "item_notes" ALTER COLUMN "authorId" DROP NOT NULL;

-- Fix item_notes authorId FK to SET NULL
ALTER TABLE "item_notes" DROP CONSTRAINT "item_notes_authorId_fkey";
ALTER TABLE "item_notes" ADD CONSTRAINT "item_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fix senderId nullable on urgent_issues
ALTER TABLE "urgent_issues" ALTER COLUMN "senderId" DROP NOT NULL;

-- Fix urgent_issues senderId FK to SET NULL
ALTER TABLE "urgent_issues" DROP CONSTRAINT "urgent_issues_senderId_fkey";
ALTER TABLE "urgent_issues" ADD CONSTRAINT "urgent_issues_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add resolvedAt index
CREATE INDEX "urgent_issues_resolvedAt_idx" ON "urgent_issues"("resolvedAt");
