-- CreateEnum
CREATE TYPE "BorrowRecordStatus" AS ENUM ('active', 'returned', 'transferred');

-- CreateEnum
CREATE TYPE "BorrowRequestStatus" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- DropForeignKey
ALTER TABLE "taken_stock_items" DROP CONSTRAINT "taken_stock_items_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "taken_stock_items" DROP CONSTRAINT "taken_stock_items_itemId_fkey";

-- DropForeignKey
ALTER TABLE "taken_stock_items" DROP CONSTRAINT "taken_stock_items_sourceInventoryTableId_fkey";

-- DropForeignKey
ALTER TABLE "taken_stock_items" DROP CONSTRAINT "taken_stock_items_sourceStockBalanceId_fkey";

-- CreateTable
CREATE TABLE "consumed_stock_items" (
    "id" TEXT NOT NULL,
    "sourceStockBalanceId" TEXT NOT NULL,
    "sourceInventoryTableId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumed_stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_records" (
    "id" TEXT NOT NULL,
    "sourceStockBalanceId" TEXT NOT NULL,
    "sourceInventoryTableId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,
    "status" "BorrowRecordStatus" NOT NULL DEFAULT 'active',
    "currentHolderId" TEXT,
    "previousBorrowRecordId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "borrow_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "borrow_requests" (
    "id" TEXT NOT NULL,
    "borrowRecordId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "BorrowRequestStatus" NOT NULL DEFAULT 'pending',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "borrow_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consumed_stock_items_sourceStockBalanceId_idx" ON "consumed_stock_items"("sourceStockBalanceId");

-- CreateIndex
CREATE INDEX "consumed_stock_items_sourceInventoryTableId_idx" ON "consumed_stock_items"("sourceInventoryTableId");

-- CreateIndex
CREATE INDEX "consumed_stock_items_itemId_idx" ON "consumed_stock_items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "borrow_records_previousBorrowRecordId_key" ON "borrow_records"("previousBorrowRecordId");

-- CreateIndex
CREATE INDEX "borrow_records_sourceStockBalanceId_idx" ON "borrow_records"("sourceStockBalanceId");

-- CreateIndex
CREATE INDEX "borrow_records_sourceInventoryTableId_idx" ON "borrow_records"("sourceInventoryTableId");

-- CreateIndex
CREATE INDEX "borrow_records_itemId_idx" ON "borrow_records"("itemId");

-- CreateIndex
CREATE INDEX "borrow_records_currentHolderId_idx" ON "borrow_records"("currentHolderId");

-- CreateIndex
CREATE INDEX "borrow_records_status_idx" ON "borrow_records"("status");

-- CreateIndex
CREATE INDEX "borrow_requests_borrowRecordId_idx" ON "borrow_requests"("borrowRecordId");

-- CreateIndex
CREATE INDEX "borrow_requests_requesterId_idx" ON "borrow_requests"("requesterId");

-- CreateIndex
CREATE INDEX "borrow_requests_status_idx" ON "borrow_requests"("status");

-- AddForeignKey
ALTER TABLE "consumed_stock_items" ADD CONSTRAINT "consumed_stock_items_sourceStockBalanceId_fkey" FOREIGN KEY ("sourceStockBalanceId") REFERENCES "stock_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumed_stock_items" ADD CONSTRAINT "consumed_stock_items_sourceInventoryTableId_fkey" FOREIGN KEY ("sourceInventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumed_stock_items" ADD CONSTRAINT "consumed_stock_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumed_stock_items" ADD CONSTRAINT "consumed_stock_items_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_sourceStockBalanceId_fkey" FOREIGN KEY ("sourceStockBalanceId") REFERENCES "stock_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_sourceInventoryTableId_fkey" FOREIGN KEY ("sourceInventoryTableId") REFERENCES "inventory_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_currentHolderId_fkey" FOREIGN KEY ("currentHolderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_records" ADD CONSTRAINT "borrow_records_previousBorrowRecordId_fkey" FOREIGN KEY ("previousBorrowRecordId") REFERENCES "borrow_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_borrowRecordId_fkey" FOREIGN KEY ("borrowRecordId") REFERENCES "borrow_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "borrow_requests" ADD CONSTRAINT "borrow_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every historical TakenStockItem row becomes a BorrowRecord.
-- Open loans (returnedAt IS NULL) stay active under their original holder;
-- already-returned loans become closed BorrowRecords with the same closedAt.
INSERT INTO "borrow_records" (
  "id", "sourceStockBalanceId", "sourceInventoryTableId", "itemId", "quantity", "notes",
  "status", "currentHolderId", "closedAt", "createdAt", "updatedAt"
)
SELECT
  "id", "sourceStockBalanceId", "sourceInventoryTableId", "itemId", "quantity", "notes",
  CASE WHEN "returnedAt" IS NULL THEN 'active' ELSE 'returned' END::"BorrowRecordStatus",
  "createdByUserId", "returnedAt", "createdAt", "updatedAt"
FROM "taken_stock_items";

-- DropTable
DROP TABLE "taken_stock_items";
