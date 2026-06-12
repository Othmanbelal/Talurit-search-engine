-- CreateEnum
CREATE TYPE "UrgentIssueStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "item_notes" (
    "id" TEXT NOT NULL,
    "stockBalanceId" TEXT NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "urgent_issues" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "stockBalanceId" TEXT NOT NULL,
    "senderId" TEXT,
    "resolvedById" TEXT,
    "message" TEXT NOT NULL,
    "itemSnapshot" JSONB NOT NULL,
    "status" "UrgentIssueStatus" NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "urgent_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "item_notes_stockBalanceId_idx" ON "item_notes"("stockBalanceId");

-- CreateIndex
CREATE INDEX "item_notes_authorId_idx" ON "item_notes"("authorId");

-- CreateIndex
CREATE INDEX "urgent_issues_tableId_idx" ON "urgent_issues"("tableId");

-- CreateIndex
CREATE INDEX "urgent_issues_stockBalanceId_idx" ON "urgent_issues"("stockBalanceId");

-- CreateIndex
CREATE INDEX "urgent_issues_senderId_idx" ON "urgent_issues"("senderId");

-- CreateIndex
CREATE INDEX "urgent_issues_status_idx" ON "urgent_issues"("status");

-- AddForeignKey
ALTER TABLE "item_notes" ADD CONSTRAINT "item_notes_stockBalanceId_fkey" FOREIGN KEY ("stockBalanceId") REFERENCES "stock_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_notes" ADD CONSTRAINT "item_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urgent_issues" ADD CONSTRAINT "urgent_issues_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "inventory_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urgent_issues" ADD CONSTRAINT "urgent_issues_stockBalanceId_fkey" FOREIGN KEY ("stockBalanceId") REFERENCES "stock_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urgent_issues" ADD CONSTRAINT "urgent_issues_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "urgent_issues" ADD CONSTRAINT "urgent_issues_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
