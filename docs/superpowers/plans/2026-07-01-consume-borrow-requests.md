# Consume, Borrow & Borrow Requests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire the "Take" stock movement and replace it with two distinct actions — **Consume** (permanent removal) and **Borrow** (temporary, holder-tracked, transferable via a request/accept/decline workflow) — while leaving "Use In" untouched.

**Architecture:** Backend: Prisma migration retires `TakenStockItem` in favor of `ConsumedStockItem` (append-only) and `BorrowRecord` (stateful, chainable via `previousBorrowRecordId`) + a new `BorrowRequest` workflow table living in its own `borrow-requests` module (mirrors the `urgent-issues` module shape). Frontend: the take/use-in movement modal gains Consume/Borrow tabs, the "Taken Items" dashboard widget/page become "Borrowed Items" with inline request/accept/decline/cancel actions via a shared `BorrowRecordActions` component.

**Tech Stack:** Node.js/Express/TypeScript/Prisma/PostgreSQL backend; React/TypeScript/Vite/Tailwind frontend; react-i18next (en+sv locales); Docker Compose.

## Global Constraints

- No source file (except `prisma/schema.prisma`, `AGENTS.md`, `PLAN.md`) may exceed 350 lines. Run `npm run check:lines` before finishing.
- Layering is enforced: routes define URLs only, controllers handle request/response only, services hold business logic, repositories hold DB access only, schemas validate input only (per `AGENTS.md`).
- Validate all backend inputs with Zod; never trust client-supplied user id or role.
- **This repo has no test runner** (no Jest/Vitest/pytest — confirmed via `server/package.json`/`client/package.json` scripts, which only run `tsc --noEmit`). There is no existing convention for adding one, and introducing a test framework is out of scope for this feature. Each task's verification step is therefore `npm run lint` (=`tsc --noEmit`) in the affected workspace (`server/` or `client/`) for compile-time correctness, and the final task is a full manual browser walkthrough against the docker-compose stack — matching this project's actual, existing verification gate (`npm run lint && npm run build && npm run check:lines && docker compose up -d --build server client`) and its `PLAN.md` phase-completion convention.
- Every user-facing string needs both an `en` and `sv` key (this branch, `feat/swedish-default-i18n`, is mid-flight on full i18n coverage — do not add English-only strings).
- Migrations live at `prisma/migrations/<timestamp>_<name>/migration.sql` (repo root, not under `server/`).
- Update `PLAN.md` at the end (final task).
- The design spec this plan implements: `docs/superpowers/specs/2026-07-01-consume-borrow-request-design.md`.

---

### Task 1: Prisma schema — retire `TakenStockItem`, add Consume/Borrow/Request models + data migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260701120000_consume_borrow_requests/migration.sql`

**Interfaces:**
- Produces: Prisma Client models `ConsumedStockItem`, `BorrowRecord`, `BorrowRequest` (accessible as `prisma.consumedStockItem`, `prisma.borrowRecord`, `prisma.borrowRequest`), enums `BorrowRecordStatus` (`active`/`returned`/`transferred`), `BorrowRequestStatus` (`pending`/`accepted`/`declined`/`cancelled`). `BorrowRecord` fields used by later tasks: `id`, `sourceStockBalanceId`, `sourceInventoryTableId`, `itemId`, `quantity` (`Prisma.Decimal`), `notes`, `status`, `currentHolderId`, `previousBorrowRecordId`, `closedAt`, `createdAt`, `updatedAt`. `BorrowRequest` fields: `id`, `borrowRecordId`, `requesterId`, `status`, `resolvedById`, `resolvedAt`, `createdAt`.

- [ ] **Step 1: Add the two new enums to `prisma/schema.prisma`**

Find this exact block (currently at lines 30-33):

```prisma
enum UrgentIssueStatus {
  open
  resolved
}
```

Replace it with:

```prisma
enum UrgentIssueStatus {
  open
  resolved
}

enum BorrowRecordStatus {
  active
  returned
  transferred
}

enum BorrowRequestStatus {
  pending
  accepted
  declined
  cancelled
}
```

- [ ] **Step 2: Replace the `TakenStockItem` model with `ConsumedStockItem`, `BorrowRecord`, `BorrowRequest`**

Find this exact block (currently at lines 197-218):

```prisma
model TakenStockItem {
  id                     String         @id @default(cuid())
  sourceStockBalanceId   String
  sourceInventoryTableId String
  itemId                 String
  quantity               Decimal
  notes                  String?
  returnedAt             DateTime?
  createdByUserId        String?
  sourceStockBalance     StockBalance   @relation(fields: [sourceStockBalanceId], references: [id], onDelete: Cascade)
  sourceInventoryTable   InventoryTable @relation(fields: [sourceInventoryTableId], references: [id], onDelete: Cascade)
  item                   InventoryItem  @relation(fields: [itemId], references: [id], onDelete: Cascade)
  createdByUser          User?          @relation("TakenStockItemUser", fields: [createdByUserId], references: [id], onDelete: SetNull)
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt

  @@index([sourceStockBalanceId])
  @@index([sourceInventoryTableId])
  @@index([itemId])
  @@index([returnedAt])
  @@map("taken_stock_items")
}
```

Replace it with:

```prisma
model ConsumedStockItem {
  id                     String         @id @default(cuid())
  sourceStockBalanceId   String
  sourceInventoryTableId String
  itemId                 String
  quantity               Decimal
  notes                  String?
  createdByUserId        String?
  sourceStockBalance     StockBalance   @relation(fields: [sourceStockBalanceId], references: [id], onDelete: Cascade)
  sourceInventoryTable   InventoryTable @relation(fields: [sourceInventoryTableId], references: [id], onDelete: Cascade)
  item                   InventoryItem  @relation(fields: [itemId], references: [id], onDelete: Cascade)
  createdByUser          User?          @relation("ConsumedStockItemUser", fields: [createdByUserId], references: [id], onDelete: SetNull)
  createdAt              DateTime       @default(now())

  @@index([sourceStockBalanceId])
  @@index([sourceInventoryTableId])
  @@index([itemId])
  @@map("consumed_stock_items")
}

model BorrowRecord {
  id                     String             @id @default(cuid())
  sourceStockBalanceId   String
  sourceInventoryTableId String
  itemId                 String
  quantity               Decimal
  notes                  String?
  status                 BorrowRecordStatus @default(active)
  currentHolderId        String?
  previousBorrowRecordId String?            @unique
  closedAt               DateTime?
  sourceStockBalance     StockBalance       @relation(fields: [sourceStockBalanceId], references: [id], onDelete: Cascade)
  sourceInventoryTable   InventoryTable     @relation(fields: [sourceInventoryTableId], references: [id], onDelete: Cascade)
  item                   InventoryItem      @relation(fields: [itemId], references: [id], onDelete: Cascade)
  currentHolder          User?              @relation("BorrowRecordHolder", fields: [currentHolderId], references: [id], onDelete: SetNull)
  previousBorrowRecord   BorrowRecord?      @relation("BorrowChain", fields: [previousBorrowRecordId], references: [id], onDelete: SetNull)
  nextBorrowRecord       BorrowRecord?      @relation("BorrowChain")
  requests               BorrowRequest[]
  createdAt              DateTime           @default(now())
  updatedAt              DateTime           @updatedAt

  @@index([sourceStockBalanceId])
  @@index([sourceInventoryTableId])
  @@index([itemId])
  @@index([currentHolderId])
  @@index([status])
  @@map("borrow_records")
}

model BorrowRequest {
  id             String              @id @default(cuid())
  borrowRecordId String
  requesterId    String
  status         BorrowRequestStatus @default(pending)
  resolvedById   String?
  resolvedAt     DateTime?
  borrowRecord   BorrowRecord        @relation(fields: [borrowRecordId], references: [id], onDelete: Cascade)
  requester      User                @relation("BorrowRequestRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  resolvedBy     User?               @relation("BorrowRequestResolver", fields: [resolvedById], references: [id], onDelete: SetNull)
  createdAt      DateTime            @default(now())

  @@index([borrowRecordId])
  @@index([requesterId])
  @@index([status])
  @@map("borrow_requests")
}
```

- [ ] **Step 3: Update `User`'s reverse relation**

Find this exact line (currently line 237, inside `model User`):

```prisma
  takenStockItems          TakenStockItem[]          @relation("TakenStockItemUser")
```

Replace it with:

```prisma
  consumedStockItems       ConsumedStockItem[]       @relation("ConsumedStockItemUser")
  currentBorrowRecords     BorrowRecord[]            @relation("BorrowRecordHolder")
  borrowRequestsMade       BorrowRequest[]           @relation("BorrowRequestRequester")
  borrowRequestsResolved   BorrowRequest[]           @relation("BorrowRequestResolver")
```

- [ ] **Step 4: Update `InventoryItem`'s reverse relation**

Find this exact line (currently line 399, inside `model InventoryItem`):

```prisma
  takenStockItems          TakenStockItem[]
```

Replace it with:

```prisma
  consumedStockItems       ConsumedStockItem[]
  borrowRecords            BorrowRecord[]
```

- [ ] **Step 5: Update `InventoryTable`'s reverse relation**

Find this exact line (currently line 510, inside `model InventoryTable`):

```prisma
  takenStockItems          TakenStockItem[]
```

Replace it with:

```prisma
  consumedStockItems       ConsumedStockItem[]
  borrowRecords            BorrowRecord[]
```

- [ ] **Step 6: Update `StockBalance`'s reverse relation**

Find this exact line (currently line 671, inside `model StockBalance`):

```prisma
  takenItems               TakenStockItem[]
```

Replace it with:

```prisma
  consumedItems            ConsumedStockItem[]
  borrowRecords            BorrowRecord[]
```

- [ ] **Step 7: Generate the migration skeleton (do not apply yet)**

Run from the repo root:

```bash
cd server && npx prisma migrate dev --schema ../prisma/schema.prisma --name consume_borrow_requests --create-only
```

Expected: a new folder `prisma/migrations/20260701<HHMMSS>_consume_borrow_requests/migration.sql` is created (timestamp reflects actual run time — rename the folder to start `20260701120000_` only if you want to match this plan's reference name exactly; the timestamp itself doesn't need to be exact). The command reports the migration as pending/not yet applied.

- [ ] **Step 8: Hand-edit the generated migration to backfill data before dropping `taken_stock_items`**

Open the generated `migration.sql`. Prisma will have generated, in order: `CREATE TYPE` statements for the two new enums, `CREATE TABLE` statements for `consumed_stock_items`/`borrow_records`/`borrow_requests` with their foreign keys, and finally a `DROP TABLE "taken_stock_items";` statement (nothing references `taken_stock_items` as a child, so Prisma drops it standalone at the end).

Find the line:

```sql
DROP TABLE "taken_stock_items";
```

Insert this block **immediately before** it (so it runs while the old table still exists, after `borrow_records` has been created):

```sql
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
```

- [ ] **Step 9: Back up the database, then apply the migration**

Per the project's backup rules, take a `pg_dump` before running this against real data:

```bash
pg_dump "$DATABASE_URL" > pre_consume_borrow_migration.sql
```

Then apply:

```bash
cd server && npx prisma migrate dev --schema ../prisma/schema.prisma
```

Expected: the pending `consume_borrow_requests` migration applies cleanly, `npx prisma generate` runs automatically, and the Prisma Client now exposes `prisma.consumedStockItem`, `prisma.borrowRecord`, `prisma.borrowRequest`.

- [ ] **Step 10: Verify**

Run:

```bash
cd server && npm run lint
```

Expected: this will show new type errors in `stock-movement.service.ts`, `stock-movement.serializer.ts`, `stock-movement-records.ts`, `structured-inventory.controller.ts`, `structured-inventory.routes.ts`, `structured-inventory.repository.ts`, `duplicate-records.ts`, `structured-inventory.serializer.ts` (they still reference `TakenStockItem`/`takenStockItems`/`takenItems`) — that's expected and fixed in Tasks 2-5. Confirm there are **no errors from `schema.prisma` itself** (i.e., `npx prisma validate --schema ../prisma/schema.prisma` passes) and no errors outside the files listed above.

- [ ] **Step 11: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): retire TakenStockItem, add ConsumedStockItem/BorrowRecord/BorrowRequest"
```

---

### Task 2: Repository + serializer for Borrow reads (`structured-inventory` module)

**Files:**
- Modify: `server/src/modules/structured-inventory/stock-movement-records.ts`
- Modify: `server/src/modules/structured-inventory/stock-movement.serializer.ts`

**Interfaces:**
- Consumes: `prisma.borrowRecord`, `prisma.consumedStockItem` from Task 1.
- Produces: `listActiveBorrowRecords()`, `findBorrowRecord(id: string)` (repository), `serializeBorrowRecord(record)` returning `{ id, quantity, notes, createdAt, currentHolder: {id,name}|null, sourceTable: {id,name,columnSettings}, sourceRow, pendingRequest: {id,requesterId,requesterName,createdAt}|null }` (serializer) — consumed by Task 3's `getBorrowedItems()`.
- `findStockRowForMovement`, `decrementStock`, `incrementStock`, `findUsedInAssignment`, `findUsedInCardWithSpots` are unchanged and still exported (consumed by Task 3 and the untouched `useStockItemInCard`).

- [ ] **Step 1: Rewrite `stock-movement-records.ts`**

Replace the entire file with:

```ts
import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";

const activeAssignmentWhere = { returnedAt: null };

export function findStockRowForMovement(tableId: string, rowId: string) {
  return prisma.stockBalance.findFirst({
    where: { id: rowId, inventoryTableId: tableId, status: { not: "archived" } },
    include: { item: true, inventoryTable: true },
  });
}

export function listActiveBorrowRecords() {
  return prisma.borrowRecord.findMany({
    where: { status: "active" },
    orderBy: { createdAt: "desc" },
    include: borrowRecordInclude(),
  });
}

export function findBorrowRecord(id: string) {
  return prisma.borrowRecord.findUnique({ where: { id }, include: borrowRecordInclude() });
}

export function findUsedInAssignment(id: string) {
  return prisma.usedInStockAssignment.findUnique({
    where: { id },
    include: { sourceStockBalance: true, sourceInventoryTable: true, item: true, card: true, spot: true },
  });
}

export function findUsedInCardWithSpots(cardId: string, tx: Prisma.TransactionClient = prisma) {
  return tx.usedInCard.findUnique({
    where: { id: cardId },
    include: {
      spots: { orderBy: { sortOrder: "asc" }, include: { assignments: { where: activeAssignmentWhere } } },
    },
  });
}

export function decrementStock(
  tx: Prisma.TransactionClient,
  row: MovementStockRow,
  quantity: number,
  movementType: string,
  userId?: string,
) {
  return tx.stockBalance.update({
    where: { id: row.id },
    data: {
      quantity: row.quantity.minus(quantity),
      movements: {
        create: {
          itemId: row.itemId,
          locationId: row.locationId,
          movementType,
          quantityChange: -quantity,
          quantityBefore: row.quantity,
          quantityAfter: row.quantity.minus(quantity),
          reason: movementReason(movementType),
          createdByUserId: userId,
        },
      },
    },
  });
}

export function incrementStock(
  tx: Prisma.TransactionClient,
  row: { id: string; itemId: string; locationId: string | null; quantity: Prisma.Decimal },
  quantity: Prisma.Decimal | number,
  movementType: string,
  userId?: string,
) {
  return tx.stockBalance.update({
    where: { id: row.id },
    data: {
      quantity: row.quantity.plus(quantity),
      movements: {
        create: {
          itemId: row.itemId,
          locationId: row.locationId,
          movementType,
          quantityChange: quantity,
          quantityBefore: row.quantity,
          quantityAfter: row.quantity.plus(quantity),
          reason: "Returned to inventory",
          createdByUserId: userId,
        },
      },
    },
  });
}

function movementReason(movementType: string) {
  if (movementType === "use_in") return "Assigned to Used In card";
  if (movementType === "consume") return "Consumed from inventory";
  if (movementType === "borrow") return "Borrowed from inventory";
  return "Taken out from inventory";
}

function borrowRecordInclude() {
  return {
    sourceStockBalance: {
      include: {
        item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
        location: true,
        inventoryTable: true,
        usedInAssignments: { where: { returnedAt: null }, include: { card: true } },
      },
    },
    sourceInventoryTable: true,
    item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
    currentHolder: { select: { id: true, name: true } },
    requests: { where: { status: "pending" as const }, include: { requester: { select: { id: true, name: true } } } },
  } satisfies Prisma.BorrowRecordInclude;
}

export type MovementStockRow = NonNullable<Awaited<ReturnType<typeof findStockRowForMovement>>>;
```

- [ ] **Step 2: Rewrite `stock-movement.serializer.ts`**

Replace the entire file with:

```ts
import type { Prisma } from "@prisma/client";
import { normalizeColumnSettings } from "./column-settings";
import { serializeStockRow } from "./structured-inventory.serializer";

type BorrowRecordWithRelations = Prisma.BorrowRecordGetPayload<{
  include: {
    sourceStockBalance: {
      include: {
        item: { include: { manufacturer: true; category: true; identifiers: true; attributes: true } };
        location: true;
        inventoryTable: true;
        usedInAssignments: { include: { card: true } };
      };
    };
    sourceInventoryTable: true;
    item: { include: { manufacturer: true; category: true; identifiers: true; attributes: true } };
    currentHolder: { select: { id: true; name: true } };
    requests: { include: { requester: { select: { id: true; name: true } } } };
  };
}>;

export function serializeBorrowRecord(record: BorrowRecordWithRelations) {
  const pendingRequest = record.requests[0];
  return {
    id: record.id,
    quantity: toNumber(record.quantity),
    notes: record.notes,
    createdAt: record.createdAt,
    currentHolder: record.currentHolder,
    sourceTable: {
      id: record.sourceInventoryTable.id,
      name: record.sourceInventoryTable.name,
      columnSettings: normalizeColumnSettings(record.sourceInventoryTable.columnSettings),
    },
    sourceRow: serializeStockRow(record.sourceStockBalance),
    pendingRequest: pendingRequest
      ? {
          id: pendingRequest.id,
          requesterId: pendingRequest.requesterId,
          requesterName: pendingRequest.requester.name,
          createdAt: pendingRequest.createdAt,
        }
      : null,
  };
}

function toNumber(value: { toNumber?: () => number } | number) {
  return typeof value === "number" ? value : value.toNumber?.() ?? Number(value);
}
```

- [ ] **Step 3: Verify**

```bash
cd server && npm run lint
```

Expected: `stock-movement-records.ts` and `stock-movement.serializer.ts` now compile clean. Remaining errors should only be in `stock-movement.service.ts`, `structured-inventory.controller.ts`, `structured-inventory.routes.ts`, `structured-inventory.repository.ts`, `duplicate-records.ts`, `structured-inventory.serializer.ts` (fixed in later tasks).

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/structured-inventory/stock-movement-records.ts server/src/modules/structured-inventory/stock-movement.serializer.ts
git commit -m "feat(server): repository/serializer for BorrowRecord reads"
```

---

### Task 3: Service layer — `consumeStockItem`, `borrowStockItem`, `getBorrowedItems`, `returnBorrowedItem`

**Files:**
- Modify: `server/src/modules/structured-inventory/stock-movement.service.ts`

**Interfaces:**
- Consumes: `decrementStock`, `incrementStock`, `findStockRowForMovement`, `findBorrowRecord`, `listActiveBorrowRecords`, `findUsedInAssignment`, `findUsedInCardWithSpots` (Task 2's repository); `serializeBorrowRecord` (Task 2's serializer); `logInteraction` (existing, unchanged); `evaluateLowStock` (existing, unchanged); `StockMovementActionInput`, `UseInCardInput` types (existing schemas, unchanged).
- Produces: `consumeStockItem(tableId, rowId, input, userId?): Promise<void>`, `borrowStockItem(tableId, rowId, input, userId?): Promise<void>`, `getBorrowedItems(): Promise<ReturnType<typeof serializeBorrowRecord>[]>`, `returnBorrowedItem(id, quantity: number | undefined, userId?): Promise<void>` — consumed by Task 4's controller. `useStockItemInCard` is unchanged and still exported — consumed by the existing `useStockItemInCardController`.

- [ ] **Step 1: Rewrite `stock-movement.service.ts`**

Replace the entire file with:

```ts
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import type { StockMovementActionInput, UseInCardInput } from "./structured-inventory.schemas";
import {
  decrementStock,
  findBorrowRecord,
  findStockRowForMovement,
  findUsedInAssignment,
  findUsedInCardWithSpots,
  incrementStock,
  listActiveBorrowRecords,
} from "./stock-movement-records";
import { serializeBorrowRecord } from "./stock-movement.serializer";
import { logInteraction } from "./interaction-log";
import { evaluateLowStock } from "../low-stock/low-stock.service";

export async function consumeStockItem(tableId: string, rowId: string, input: StockMovementActionInput, userId?: string) {
  const row = await loadAvailableRow(tableId, rowId, input.quantity);
  await prisma.$transaction(async (tx) => {
    await decrementStock(tx, row, input.quantity, "consume", userId);
    await tx.consumedStockItem.create({
      data: {
        sourceStockBalanceId: row.id,
        sourceInventoryTableId: row.inventoryTableId!,
        itemId: row.itemId,
        quantity: input.quantity,
        notes: input.notes,
        createdByUserId: userId,
      },
    });
  });
  await logInteraction({
    action: "consume",
    stockBalanceId: row.id,
    inventoryTableId: row.inventoryTableId,
    itemId: row.itemId,
    userId,
    quantity: input.quantity,
    notes: input.notes,
    itemName: row.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:consume]", err));
  void evaluateLowStock(row.id);
}

export async function borrowStockItem(tableId: string, rowId: string, input: StockMovementActionInput, userId?: string) {
  const row = await loadAvailableRow(tableId, rowId, input.quantity);
  await prisma.$transaction(async (tx) => {
    await decrementStock(tx, row, input.quantity, "borrow", userId);
    await tx.borrowRecord.create({
      data: {
        sourceStockBalanceId: row.id,
        sourceInventoryTableId: row.inventoryTableId!,
        itemId: row.itemId,
        quantity: input.quantity,
        notes: input.notes,
        currentHolderId: userId,
      },
    });
  });
  await logInteraction({
    action: "borrow",
    stockBalanceId: row.id,
    inventoryTableId: row.inventoryTableId,
    itemId: row.itemId,
    userId,
    quantity: input.quantity,
    notes: input.notes,
    itemName: row.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:borrow]", err));
  void evaluateLowStock(row.id);
}

export async function useStockItemInCard(tableId: string, rowId: string, input: UseInCardInput, userId?: string) {
  const row = await loadAvailableRow(tableId, rowId, input.quantity);
  const card = await findUsedInCardWithSpots(input.cardId);
  if (!card) throw new AppError("Used In card not found.", 404);
  const spotIds = validateSpotSelection(card, input.quantity, input.spotIds);

  await prisma.$transaction(async (tx) => {
    await decrementStock(tx, row, input.quantity, "use_in", userId);
    for (const spotId of assignmentSpotIds(spotIds, input.quantity)) {
      await tx.usedInStockAssignment.create({
        data: {
          cardId: card.id,
          spotId,
          sourceStockBalanceId: row.id,
          sourceInventoryTableId: row.inventoryTableId!,
          itemId: row.itemId,
          quantity: spotId ? 1 : input.quantity,
          notes: input.notes,
          createdByUserId: userId,
        },
      });
    }
  });
  await logInteraction({
    action: "use_in",
    stockBalanceId: row.id,
    inventoryTableId: row.inventoryTableId,
    itemId: row.itemId,
    userId,
    quantity: input.quantity,
    notes: input.notes,
    itemName: row.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:use_in]", err));
  void evaluateLowStock(row.id);
}

export async function getBorrowedItems() {
  const records = await listActiveBorrowRecords();
  return records.map(serializeBorrowRecord);
}

export async function returnBorrowedItem(id: string, quantity: number | undefined, userId?: string) {
  const record = await findBorrowRecord(id);
  if (!record || record.status !== "active") throw new AppError("Borrowed item was not found.", 404);
  if (record.currentHolderId !== userId) throw new AppError("Only the current holder can return this item.", 403);

  const heldQuantity = record.quantity.toNumber();
  const returnQuantity = quantity ?? heldQuantity;
  if (returnQuantity <= 0 || returnQuantity > heldQuantity) {
    throw new AppError(`Enter a quantity between 1 and ${record.quantity.toString()}.`, 400);
  }
  const fullyReturned = returnQuantity === heldQuantity;

  await prisma.$transaction(async (tx) => {
    await incrementStock(tx, record.sourceStockBalance, returnQuantity, "return", userId);
    if (fullyReturned) {
      await tx.borrowRecord.update({ where: { id }, data: { status: "returned", closedAt: new Date(), quantity: 0 } });
      await tx.borrowRequest.updateMany({
        where: { borrowRecordId: id, status: "pending" },
        data: { status: "cancelled", resolvedAt: new Date() },
      });
    } else {
      await tx.borrowRecord.update({ where: { id }, data: { quantity: record.quantity.minus(returnQuantity) } });
    }
  });

  await logInteraction({
    action: "return",
    stockBalanceId: record.sourceStockBalanceId,
    inventoryTableId: record.sourceInventoryTableId,
    itemId: record.itemId,
    userId,
    quantity: String(returnQuantity),
    itemName: record.item?.name,
  }).catch((err: unknown) => console.error("[logInteraction:return]", err));
  void evaluateLowStock(record.sourceStockBalanceId);
}

async function loadAvailableRow(tableId: string, rowId: string, quantity: number) {
  const row = await findStockRowForMovement(tableId, rowId);
  if (!row || !row.inventoryTableId) throw new AppError("Inventory row not found.", 404);
  if (row.quantity.lessThan(quantity)) {
    throw new AppError(`Only ${row.quantity.toString()} ${row.unit} available.`, 400);
  }
  return row;
}

function validateSpotSelection(card: CardWithSpots, quantity: number, selectedSpotIds: string[]) {
  if (card.spots.length === 0) return [];
  if (selectedSpotIds.length !== quantity) {
    throw new AppError(`Select ${quantity} empty spot${quantity === 1 ? "" : "s"} for this card.`, 400);
  }
  const emptySpotIds = new Set(card.spots.filter((spot) => spot.assignments.length === 0).map((spot) => spot.id));
  const uniqueSelected = new Set(selectedSpotIds);
  if (uniqueSelected.size !== selectedSpotIds.length) throw new AppError("Each spot can only be selected once.", 400);
  if (![...uniqueSelected].every((spotId) => emptySpotIds.has(spotId))) {
    throw new AppError("One or more selected spots are already occupied.", 400);
  }
  return selectedSpotIds;
}

function assignmentSpotIds(spotIds: string[], _quantity: number) {
  return spotIds.length > 0 ? spotIds : [null];
}

type CardWithSpots = NonNullable<Awaited<ReturnType<typeof findUsedInCardWithSpots>>>;
```

Note: `incrementStock(tx, record.sourceStockBalance, returnQuantity, ...)` passes a plain `number` — this works because Task 2's `incrementStock` signature was widened to accept `Prisma.Decimal | number` (Decimal.js's `.plus()`/Prisma's Decimal input both accept a plain number directly, so no manual `Decimal` construction is needed for a partial return).

- [ ] **Step 2: Verify**

```bash
cd server && npm run lint
```

Expected: `stock-movement.service.ts` compiles clean. Remaining errors should only be in `structured-inventory.controller.ts`, `structured-inventory.routes.ts`, `structured-inventory.repository.ts`, `duplicate-records.ts`, `structured-inventory.serializer.ts`.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/structured-inventory/stock-movement.service.ts
git commit -m "feat(server): consume/borrow/return service functions, remove takeStockItem"
```

---

### Task 4: Schemas + controller + routes — wire `/consume`, `/borrow`, `/borrowed-items`, `/borrowed-items/:id/return`

**Files:**
- Modify: `server/src/modules/structured-inventory/structured-inventory.schemas.ts`
- Modify: `server/src/modules/structured-inventory/structured-inventory.controller.ts`
- Modify: `server/src/modules/structured-inventory/structured-inventory.routes.ts`

**Interfaces:**
- Consumes: `consumeStockItem`, `borrowStockItem`, `getBorrowedItems`, `returnBorrowedItem`, `useStockItemInCard` (Task 3).
- Produces: `returnBorrowInputSchema` (`{ quantity?: number }`); controllers `consumeStockItemController`, `borrowStockItemController`, `listBorrowedItemsController`, `returnBorrowedItemController`; routes `POST /tables/:id/rows/:rowId/consume`, `POST /tables/:id/rows/:rowId/borrow`, `GET /borrowed-items`, `POST /borrowed-items/:id/return`.

- [ ] **Step 1: Add `returnBorrowInputSchema` to `structured-inventory.schemas.ts`**

Find:

```ts
export const useInCardSchema = stockMovementActionSchema.extend({
  cardId: z.string().min(1),
  spotIds: z.array(z.string().min(1)).optional().default([]),
});
```

Add immediately after it:

```ts
export const returnBorrowInputSchema = z.object({
  quantity: z.coerce.number().int().min(1).optional(),
});
```

Find:

```ts
export type UseInCardInput = z.infer<typeof useInCardSchema>;
```

Add immediately after it:

```ts
export type ReturnBorrowInput = z.infer<typeof returnBorrowInputSchema>;
```

- [ ] **Step 2: Update `structured-inventory.controller.ts`**

Find the import block:

```ts
import {
  getTakenItems,
  returnTakenItem,
  takeStockItem,
  useStockItemInCard,
} from "./stock-movement.service";
```

Replace with:

```ts
import {
  borrowStockItem,
  consumeStockItem,
  getBorrowedItems,
  returnBorrowedItem,
  useStockItemInCard,
} from "./stock-movement.service";
```

Find the schemas import line:

```ts
import {
  addStockRowSchema,
  createInventoryGroupSchema,
  createInventoryTableSchema,
  idParamSchema,
  listStockRowsQuerySchema,
  mergeDuplicateRowsSchema,
  stockMovementActionSchema,
  tableColumnSettingsSchema,
  updateStockRowSchema,
  useInCardSchema,
} from "./structured-inventory.schemas";
```

Replace with:

```ts
import {
  addStockRowSchema,
  createInventoryGroupSchema,
  createInventoryTableSchema,
  idParamSchema,
  listStockRowsQuerySchema,
  mergeDuplicateRowsSchema,
  returnBorrowInputSchema,
  stockMovementActionSchema,
  tableColumnSettingsSchema,
  updateStockRowSchema,
  useInCardSchema,
} from "./structured-inventory.schemas";
```

Find:

```ts
export async function takeStockItemController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await takeStockItem(id, rowId, stockMovementActionSchema.parse(request.body), request.user?.id);
  return response.status(204).send();
}

export async function useStockItemInCardController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await useStockItemInCard(id, rowId, useInCardSchema.parse(request.body), request.user?.id);
  return response.status(204).send();
}

export async function listTakenItemsController(_request: Request, response: Response) {
  const items = await getTakenItems();
  return response.json(successResponse({ items }));
}

export async function returnTakenItemController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await returnTakenItem(id, request.user?.id);
  return response.status(204).send();
}
```

Replace with:

```ts
export async function consumeStockItemController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await consumeStockItem(id, rowId, stockMovementActionSchema.parse(request.body), request.user?.id);
  return response.status(204).send();
}

export async function borrowStockItemController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await borrowStockItem(id, rowId, stockMovementActionSchema.parse(request.body), request.user?.id);
  return response.status(204).send();
}

export async function useStockItemInCardController(request: Request, response: Response) {
  const { id, rowId } = rowParams(request.params);
  await useStockItemInCard(id, rowId, useInCardSchema.parse(request.body), request.user?.id);
  return response.status(204).send();
}

export async function listBorrowedItemsController(_request: Request, response: Response) {
  const items = await getBorrowedItems();
  return response.json(successResponse({ items }));
}

export async function returnBorrowedItemController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  const input = returnBorrowInputSchema.parse(request.body ?? {});
  await returnBorrowedItem(id, input.quantity, request.user?.id);
  return response.status(204).send();
}
```

- [ ] **Step 3: Update `structured-inventory.routes.ts`**

Find the controller import block and replace `listTakenItemsController`, `returnTakenItemController`, `takeStockItemController` with `listBorrowedItemsController`, `returnBorrowedItemController`, `consumeStockItemController`, `borrowStockItemController`:

```ts
import {
  addStructuredStockRowController,
  archiveStructuredStockRowController,
  createStructuredInventoryGroupController,
  createStructuredInventoryTableController,
  deleteStructuredInventoryGroupController,
  deleteStructuredInventoryTableController,
  deleteStructuredStockRowController,
  getStructuredInventoryGroupController,
  getStructuredStockRowController,
  getStructuredStockRowHistoryController,
  getStructuredInventoryTableController,
  listBorrowedItemsController,
  listStructuredDuplicatesController,
  listStructuredInventoriesController,
  listStructuredInventoryRowsController,
  listTableLowStockRowsController,
  mergeStructuredDuplicatesController,
  returnBorrowedItemController,
  restoreStructuredStockRowController,
  borrowStockItemController,
  consumeStockItemController,
  updateStructuredInventoryTableColumnsController,
  updateStructuredStockRowController,
  useStockItemInCardController,
} from "./structured-inventory.controller";
```

Find:

```ts
structuredInventoryRoutes.get("/taken-items", asyncHandler(listTakenItemsController));
structuredInventoryRoutes.post("/taken-items/:id/return", canTakeReturn, asyncHandler(returnTakenItemController));
```

Replace with:

```ts
structuredInventoryRoutes.get("/borrowed-items", asyncHandler(listBorrowedItemsController));
structuredInventoryRoutes.post("/borrowed-items/:id/return", canTakeReturn, asyncHandler(returnBorrowedItemController));
```

(GET `/borrowed-items` deliberately has no role middleware beyond the module-wide `requireAuth`, matching the old `/taken-items` behavior — every authenticated role including viewer can see the list; only the return action is gated to `canTakeReturn`.)

Find:

```ts
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/take", canTakeReturn, asyncHandler(takeStockItemController));
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/use-in", canTakeReturn, asyncHandler(useStockItemInCardController));
```

Replace with:

```ts
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/consume", canTakeReturn, asyncHandler(consumeStockItemController));
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/borrow", canTakeReturn, asyncHandler(borrowStockItemController));
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/use-in", canTakeReturn, asyncHandler(useStockItemInCardController));
```

- [ ] **Step 4: Verify**

```bash
cd server && npm run lint
```

Expected: `structured-inventory.controller.ts` and `structured-inventory.routes.ts` compile clean. Remaining errors should only be in `structured-inventory.repository.ts`, `duplicate-records.ts`, `structured-inventory.serializer.ts` (Task 5).

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/structured-inventory/structured-inventory.schemas.ts server/src/modules/structured-inventory/structured-inventory.controller.ts server/src/modules/structured-inventory/structured-inventory.routes.ts
git commit -m "feat(server): expose consume/borrow/borrowed-items endpoints, remove /take"
```

---

### Task 5: Rename row-level "taken" activity pills to "borrow" (repository, duplicate check, serializer, client renderer)

This is a separate concern from Tasks 2-4: independent of the dashboard/borrowed-items list, each stock row in `StructuredStockRowsTable` shows inline pills like "x2 taken by Anna" / "x1 used in Card X by Bob", built from an active-loan include on the row query itself. These references to `takenItems` must be renamed too.

**Files:**
- Modify: `server/src/modules/structured-inventory/structured-inventory.repository.ts`
- Modify: `server/src/modules/structured-inventory/duplicate-records.ts`
- Modify: `server/src/modules/structured-inventory/structured-inventory.serializer.ts`
- Modify: `client/src/types/structured-inventory.ts` (the `ActivityTag` type only — the rest of this file is handled in Task 9)
- Modify: `client/src/components/structured-inventory/StructuredStockRowsTable.tsx`

**Interfaces:**
- Consumes: `BorrowRecord` model (Task 1), `userNameSelect()` (existing helper in `structured-inventory.repository.ts`, unchanged).
- Produces: row's `activityTags` now includes `{ type: "borrow", quantity, userName }` entries sourced from active `BorrowRecord`s instead of `{ type: "taken", ... }` from `TakenStockItem`.

- [ ] **Step 1: `structured-inventory.repository.ts`** — there are three identical include sites (`findStockRows`, `findStockRow`, and the `stockRowFullInclude` constant). In each, find:

```ts
        takenItems: { where: { returnedAt: null }, include: { createdByUser: userNameSelect() } },
```

Replace **all three occurrences** with:

```ts
        borrowRecords: { where: { status: "active" }, include: { currentHolder: userNameSelect() } },
```

(Use the same indentation as the line being replaced at each of the three sites — two are inside `include: {...}` blocks at 8-space indent, one is inside the `stockRowFullInclude` object literal at 2-space indent; match whichever the surrounding block uses.)

- [ ] **Step 2: `duplicate-records.ts`**

Find:

```ts
const duplicateInclude = {
  item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
  location: true,
  usedInAssignments: { where: { returnedAt: null }, include: { card: true } },
  takenItems: { where: { returnedAt: null } },
} satisfies Prisma.StockBalanceInclude;
```

Replace with:

```ts
const duplicateInclude = {
  item: { include: { manufacturer: true, category: true, identifiers: true, attributes: true } },
  location: true,
  usedInAssignments: { where: { returnedAt: null }, include: { card: true } },
  borrowRecords: { where: { status: "active" } },
} satisfies Prisma.StockBalanceInclude;
```

Find:

```ts
    if (row.usedInAssignments.length > 0 || row.takenItems.length > 0) {
      throw new AppError("Return used/taken duplicate rows before merging.", 400);
    }
```

Replace with:

```ts
    if (row.usedInAssignments.length > 0 || row.borrowRecords.length > 0) {
      throw new AppError("Return used/borrowed duplicate rows before merging.", 400);
    }
```

- [ ] **Step 3: `structured-inventory.serializer.ts`**

Find:

```ts
type TakenItemRecord = Prisma.TakenStockItemGetPayload<{}> & {
  createdByUser?: { name: string } | null;
};
```

Replace with:

```ts
type BorrowRecordActivityRecord = Prisma.BorrowRecordGetPayload<{}> & {
  currentHolder?: { name: string } | null;
};
```

Find:

```ts
type StockRowRecord = Omit<BaseStockRowRecord, "usedInAssignments"> & {
  usedInAssignments: UsedInAssignmentRecord[];
  takenItems?: TakenItemRecord[];
  warehouseSlotAssignments?: WarehousePlacementRecord[];
};
```

Replace with:

```ts
type StockRowRecord = Omit<BaseStockRowRecord, "usedInAssignments"> & {
  usedInAssignments: UsedInAssignmentRecord[];
  borrowRecords?: BorrowRecordActivityRecord[];
  warehouseSlotAssignments?: WarehousePlacementRecord[];
};
```

Find:

```ts
  for (const taken of row.takenItems ?? []) {
    const userName = displayUserName(taken.createdByUser?.name);
    const key = `taken:${userName}`;
    const current = tags.get(key) ?? { type: "taken" as const, quantity: 0, userName };
    current.quantity += toNumber(taken.quantity);
    tags.set(key, current);
  }
```

Replace with:

```ts
  for (const borrowed of row.borrowRecords ?? []) {
    const userName = displayUserName(borrowed.currentHolder?.name);
    const key = `borrow:${userName}`;
    const current = tags.get(key) ?? { type: "borrow" as const, quantity: 0, userName };
    current.quantity += toNumber(borrowed.quantity);
    tags.set(key, current);
  }
```

Find:

```ts
type ActivityTag = {
  type: "used_in" | "taken";
  quantity: number;
  userName: string;
  cardId?: string;
  cardName?: string;
};
```

Replace with:

```ts
type ActivityTag = {
  type: "used_in" | "borrow";
  quantity: number;
  userName: string;
  cardId?: string;
  cardName?: string;
};
```

- [ ] **Step 4: `client/src/types/structured-inventory.ts`** — update only the `ActivityTag` type

Find:

```ts
export type ActivityTag = {
  type: "used_in" | "taken";
  quantity: number;
  userName: string;
  cardId?: string;
  cardName?: string;
};
```

Replace with:

```ts
export type ActivityTag = {
  type: "used_in" | "borrow";
  quantity: number;
  userName: string;
  cardId?: string;
  cardName?: string;
};
```

- [ ] **Step 5: `client/src/components/structured-inventory/StructuredStockRowsTable.tsx`**

Find:

```ts
function ActivityTagPill({ tag }: { tag: NonNullable<StructuredStockRow["activityTags"]>[number] }) {
  const isTaken = tag.type === "taken";
  const tone = isTaken ? "border-orange-400/40 bg-orange-500/10 text-orange-200" : "border-accent/40 bg-accent/10 text-accent";
  return <span className={`rounded border px-2 py-0.5 text-[11px] ${tone}`}>{activityTagLabel(tag)}</span>;
}

function activityTagLabel(tag: NonNullable<StructuredStockRow["activityTags"]>[number]) {
  if (tag.type === "taken") return `x${formatNumber(tag.quantity)} taken by ${tag.userName}`;
  return `x${formatNumber(tag.quantity)} used in ${tag.cardName ?? "card"} by ${tag.userName}`;
}
```

Replace with:

```ts
function ActivityTagPill({ tag }: { tag: NonNullable<StructuredStockRow["activityTags"]>[number] }) {
  const isBorrowed = tag.type === "borrow";
  const tone = isBorrowed ? "border-orange-400/40 bg-orange-500/10 text-orange-200" : "border-accent/40 bg-accent/10 text-accent";
  return <span className={`rounded border px-2 py-0.5 text-[11px] ${tone}`}>{activityTagLabel(tag)}</span>;
}

function activityTagLabel(tag: NonNullable<StructuredStockRow["activityTags"]>[number]) {
  if (tag.type === "borrow") return `x${formatNumber(tag.quantity)} borrowed by ${tag.userName}`;
  return `x${formatNumber(tag.quantity)} used in ${tag.cardName ?? "card"} by ${tag.userName}`;
}
```

Note: `inventory.json`'s `stats.taken` and `table.take` keys are not referenced by any component (confirmed by search) — they're already-vestigial and are left untouched, out of scope for this feature.

- [ ] **Step 6: Verify**

```bash
cd server && npm run lint && cd ../client && npm run lint
```

Expected: both workspaces compile with **zero remaining references to `TakenStockItem`/`takenStockItems`/`takenItems`**. Confirm with:

```bash
grep -rn "TakenStockItem\|takenStockItems\|takenItems" server/src client/src
```

Expected: no output (the only remaining hits should be in files not yet touched by later, unrelated tasks — if any appear here, re-check Tasks 2-5 covered every site).

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/structured-inventory/structured-inventory.repository.ts server/src/modules/structured-inventory/duplicate-records.ts server/src/modules/structured-inventory/structured-inventory.serializer.ts client/src/types/structured-inventory.ts client/src/components/structured-inventory/StructuredStockRowsTable.tsx
git commit -m "refactor: rename row-level 'taken' activity pills to 'borrow'"
```

---

### Task 6: New `borrow-requests` module — schemas + repository

**Files:**
- Create: `server/src/modules/borrow-requests/borrow-requests.schemas.ts`
- Create: `server/src/modules/borrow-requests/borrow-requests.repository.ts`

**Interfaces:**
- Consumes: `prisma.borrowRequest`, `prisma.borrowRecord`, `BorrowRecord` type (Task 1).
- Produces: `createBorrowRequestSchema` (`{ borrowRecordId: string }`), `idParamSchema` (`{ id: string }`); repository `createRequest(borrowRecordId, requesterId)`, `findPendingRequestForRecord(borrowRecordId)`, `findRequestWithRecord(id)` (returns `{ ...BorrowRequest fields, borrowRecord: BorrowRecord }`), `resolveRequestAtomic(id, status, resolvedById): Promise<boolean>`, `transferBorrowRecord(oldRecord: BorrowRecord, newHolderId: string): Promise<BorrowRecord>` — all consumed by Task 7's service.

- [ ] **Step 1: Create `borrow-requests.schemas.ts`**

```ts
import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const createBorrowRequestSchema = z.object({
  borrowRecordId: z.string().min(1),
});

export type CreateBorrowRequestInput = z.infer<typeof createBorrowRequestSchema>;
```

- [ ] **Step 2: Create `borrow-requests.repository.ts`**

```ts
import type { BorrowRecord, BorrowRequestStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";

export function createRequest(borrowRecordId: string, requesterId: string) {
  return prisma.borrowRequest.create({ data: { borrowRecordId, requesterId } });
}

export function findPendingRequestForRecord(borrowRecordId: string) {
  return prisma.borrowRequest.findFirst({ where: { borrowRecordId, status: "pending" } });
}

export function findRequestWithRecord(id: string) {
  return prisma.borrowRequest.findUnique({
    where: { id },
    include: { borrowRecord: true },
  });
}

/** Atomically flips a request from pending to a terminal status. Returns false if it was no longer pending (already resolved by someone else). */
export async function resolveRequestAtomic(id: string, status: BorrowRequestStatus, resolvedById: string) {
  const result = await prisma.borrowRequest.updateMany({
    where: { id, status: "pending" },
    data: { status, resolvedById, resolvedAt: new Date() },
  });
  return result.count === 1;
}

export async function transferBorrowRecord(oldRecord: BorrowRecord, newHolderId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.borrowRecord.update({
      where: { id: oldRecord.id },
      data: { status: "transferred", closedAt: new Date() },
    });
    return tx.borrowRecord.create({
      data: {
        sourceStockBalanceId: oldRecord.sourceStockBalanceId,
        sourceInventoryTableId: oldRecord.sourceInventoryTableId,
        itemId: oldRecord.itemId,
        quantity: oldRecord.quantity,
        notes: oldRecord.notes,
        currentHolderId: newHolderId,
        previousBorrowRecordId: oldRecord.id,
        status: "active",
      },
    });
  });
}
```

- [ ] **Step 3: Verify**

```bash
cd server && npm run lint
```

Expected: both new files compile clean (nothing else references them yet).

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/borrow-requests/borrow-requests.schemas.ts server/src/modules/borrow-requests/borrow-requests.repository.ts
git commit -m "feat(server): borrow-requests schemas and repository"
```

---

### Task 7: `borrow-requests` module — service (authorization + race-safe resolve)

**Files:**
- Create: `server/src/modules/borrow-requests/borrow-requests.service.ts`

**Interfaces:**
- Consumes: `createRequest`, `findPendingRequestForRecord`, `findRequestWithRecord`, `resolveRequestAtomic`, `transferBorrowRecord` (Task 6); `isTableManager` (existing, `server/src/modules/managers/manager-access.ts`); `AppError` (existing).
- Produces: `requestBorrow(borrowRecordId, requesterId): Promise<BorrowRequest>`, `acceptRequest(requestId, actorId, actorRole): Promise<BorrowRecord>`, `declineRequest(requestId, actorId, actorRole): Promise<void>`, `cancelRequest(requestId, requesterId): Promise<void>` — consumed by Task 8's controller.

- [ ] **Step 1: Create `borrow-requests.service.ts`**

```ts
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { isTableManager } from "../managers/manager-access";
import type { BorrowRecord } from "@prisma/client";
import {
  createRequest,
  findPendingRequestForRecord,
  findRequestWithRecord,
  resolveRequestAtomic,
  transferBorrowRecord,
} from "./borrow-requests.repository";

export async function requestBorrow(borrowRecordId: string, requesterId: string) {
  const record = await prisma.borrowRecord.findUnique({ where: { id: borrowRecordId } });
  if (!record || record.status !== "active") throw new AppError("Borrowed item not found.", 404);
  if (record.currentHolderId === requesterId) throw new AppError("You already have this item.", 400);
  const pending = await findPendingRequestForRecord(borrowRecordId);
  if (pending) throw new AppError("This item already has a pending request.", 400);
  return createRequest(borrowRecordId, requesterId);
}

export async function acceptRequest(requestId: string, actorId: string, actorRole: string) {
  const request = await findRequestWithRecord(requestId);
  if (!request || request.status !== "pending") throw new AppError("Request not found.", 404);
  await authorizeResolver(request.borrowRecord, actorId, actorRole);

  const resolved = await resolveRequestAtomic(requestId, "accepted", actorId);
  if (!resolved) throw new AppError("This request was already resolved.", 409);

  return transferBorrowRecord(request.borrowRecord, request.requesterId);
}

export async function declineRequest(requestId: string, actorId: string, actorRole: string) {
  const request = await findRequestWithRecord(requestId);
  if (!request || request.status !== "pending") throw new AppError("Request not found.", 404);
  await authorizeResolver(request.borrowRecord, actorId, actorRole);

  const resolved = await resolveRequestAtomic(requestId, "declined", actorId);
  if (!resolved) throw new AppError("This request was already resolved.", 409);
}

export async function cancelRequest(requestId: string, requesterId: string) {
  const request = await findRequestWithRecord(requestId);
  if (!request || request.status !== "pending") throw new AppError("Request not found.", 404);
  if (request.requesterId !== requesterId) throw new AppError("Only the requester can cancel this request.", 403);

  const resolved = await resolveRequestAtomic(requestId, "cancelled", requesterId);
  if (!resolved) throw new AppError("This request was already resolved.", 409);
}

async function authorizeResolver(record: BorrowRecord, actorId: string, actorRole: string) {
  if (actorRole === "admin") return;
  if (record.currentHolderId === actorId) return;
  if (actorRole === "manager" && (await isTableManager(actorId, record.sourceInventoryTableId))) return;
  throw new AppError("Only the current holder, table manager, or admin can resolve this request.", 403);
}
```

Note the "current holder only" rule from the design spec falls out naturally here: `authorizeResolver` checks `record.currentHolderId`, which after a transfer points to the *new* holder — a past holder further up the chain has no standing right, since their id is no longer in `currentHolderId` on the (new) active record being resolved.

- [ ] **Step 2: Verify**

```bash
cd server && npm run lint
```

Expected: compiles clean.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/borrow-requests/borrow-requests.service.ts
git commit -m "feat(server): borrow-requests service — request/accept/decline/cancel"
```

---

### Task 8: `borrow-requests` module — controller + routes, mount in `app.ts`

**Files:**
- Create: `server/src/modules/borrow-requests/borrow-requests.controller.ts`
- Create: `server/src/modules/borrow-requests/borrow-requests.routes.ts`
- Modify: `server/src/app.ts`

**Interfaces:**
- Consumes: `requestBorrow`, `acceptRequest`, `declineRequest`, `cancelRequest` (Task 7); `createBorrowRequestSchema`, `idParamSchema` (Task 6); `requireAuth`, `requireRoles`, `asyncHandler` (existing middleware/utils, unchanged).
- Produces: `POST /api/borrow-requests`, `POST /api/borrow-requests/:id/accept`, `POST /api/borrow-requests/:id/decline`, `POST /api/borrow-requests/:id/cancel` — consumed by Task 9's client service.

- [ ] **Step 1: Create `borrow-requests.controller.ts`**

```ts
import type { Request, Response } from "express";
import { createBorrowRequestSchema, idParamSchema } from "./borrow-requests.schemas";
import { acceptRequest, cancelRequest, declineRequest, requestBorrow } from "./borrow-requests.service";

export async function createBorrowRequestController(request: Request, response: Response) {
  const input = createBorrowRequestSchema.parse(request.body);
  await requestBorrow(input.borrowRecordId, request.user!.id);
  return response.status(204).send();
}

export async function acceptBorrowRequestController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await acceptRequest(id, request.user!.id, request.user!.role);
  return response.status(204).send();
}

export async function declineBorrowRequestController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await declineRequest(id, request.user!.id, request.user!.role);
  return response.status(204).send();
}

export async function cancelBorrowRequestController(request: Request, response: Response) {
  const { id } = idParamSchema.parse(request.params);
  await cancelRequest(id, request.user!.id);
  return response.status(204).send();
}
```

- [ ] **Step 2: Create `borrow-requests.routes.ts`**

```ts
import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  acceptBorrowRequestController,
  cancelBorrowRequestController,
  createBorrowRequestController,
  declineBorrowRequestController,
} from "./borrow-requests.controller";

export const borrowRequestRoutes = Router();
borrowRequestRoutes.use(requireAuth);

const canRequestOrResolve = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

borrowRequestRoutes.post("/", canRequestOrResolve, asyncHandler(createBorrowRequestController));
borrowRequestRoutes.post("/:id/accept", canRequestOrResolve, asyncHandler(acceptBorrowRequestController));
borrowRequestRoutes.post("/:id/decline", canRequestOrResolve, asyncHandler(declineBorrowRequestController));
borrowRequestRoutes.post("/:id/cancel", canRequestOrResolve, asyncHandler(cancelBorrowRequestController));
```

(The coarse role gate keeps viewers out entirely; the fine-grained "must be holder, table manager, or admin" check happens inside `authorizeResolver` in the service, same split as the rest of this codebase.)

- [ ] **Step 3: Mount the new router in `server/src/app.ts`**

Find:

```ts
import { urgentIssueRoutes } from "./modules/urgent-issues/urgent-issues.routes";
```

Add immediately after it:

```ts
import { borrowRequestRoutes } from "./modules/borrow-requests/borrow-requests.routes";
```

Find:

```ts
  app.use(`${API_PREFIX}/urgent-issues`, urgentIssueRoutes);
```

Add immediately after it:

```ts
  app.use(`${API_PREFIX}/borrow-requests`, borrowRequestRoutes);
```

- [ ] **Step 4: Verify**

```bash
cd server && npm run lint && npm run build
```

Expected: both pass with zero errors — this is the last backend task, so the whole `server/` workspace should now be clean.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/borrow-requests/borrow-requests.controller.ts server/src/modules/borrow-requests/borrow-requests.routes.ts server/src/app.ts
git commit -m "feat(server): borrow-requests controller/routes, mount at /api/borrow-requests"
```

---

### Task 9: Frontend types + services

**Files:**
- Modify: `client/src/types/structured-inventory.ts`
- Modify: `client/src/services/structured-inventory.service.ts`
- Create: `client/src/services/borrow-requests.service.ts`

**Interfaces:**
- Produces: type `BorrowedItem` (replaces `TakenStockItem`); service functions `consumeStructuredStockRowRequest(tableId, rowId, input)`, `borrowStructuredStockRowRequest(tableId, rowId, input)`, `listBorrowedItemsRequest(): Promise<{items: BorrowedItem[]}>`, `returnBorrowedItemRequest(id, quantity?)`, `createBorrowRequestRequest(borrowRecordId)`, `acceptBorrowRequestRequest(id)`, `declineBorrowRequestRequest(id)`, `cancelBorrowRequestRequest(id)` — all consumed by Tasks 10-12.

- [ ] **Step 1: `client/src/types/structured-inventory.ts`** — replace `TakenStockItem`

Find:

```ts
export type TakenStockItem = {
  id: string;
  quantity: number;
  notes?: string | null;
  createdAt: string;
  sourceTable: { id: string; name: string; columnSettings: TableColumnSettings };
  sourceRow: StructuredStockRow;
};
```

Replace with:

```ts
export type BorrowedItem = {
  id: string;
  quantity: number;
  notes?: string | null;
  createdAt: string;
  currentHolder: { id: string; name: string } | null;
  sourceTable: { id: string; name: string; columnSettings: TableColumnSettings };
  sourceRow: StructuredStockRow;
  pendingRequest: { id: string; requesterId: string; requesterName: string; createdAt: string } | null;
};
```

- [ ] **Step 2: `client/src/services/structured-inventory.service.ts`** — update imports

Find:

```ts
import type {
  AddStockRowInput,
  ColumnSettingsInput,
  CreateInventoryGroupInput,
  CreateInventoryTableInput,
  ItemInteractionLog,
  StructuredInventoryGroup,
  StructuredInventoryOverview,
  StructuredInventoryTable,
  StructuredDuplicateGroup,
  StructuredStockRowsResponse,
  StructuredStockRow,
  StructuredTableFilters,
  StockMovementInput,
  TakenStockItem,
  UpdateStockRowInput,
  UseInCardInput,
} from "../types/structured-inventory";
```

Replace with:

```ts
import type {
  AddStockRowInput,
  BorrowedItem,
  ColumnSettingsInput,
  CreateInventoryGroupInput,
  CreateInventoryTableInput,
  ItemInteractionLog,
  StructuredInventoryGroup,
  StructuredInventoryOverview,
  StructuredInventoryTable,
  StructuredDuplicateGroup,
  StructuredStockRowsResponse,
  StructuredStockRow,
  StructuredTableFilters,
  StockMovementInput,
  UpdateStockRowInput,
  UseInCardInput,
} from "../types/structured-inventory";
```

- [ ] **Step 3: replace the take/taken-items functions**

Find:

```ts
export function takeStructuredStockRowRequest(tableId: string, rowId: string, input: StockMovementInput) {
  return apiRequest<unknown>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/take`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useStructuredStockRowInCardRequest(tableId: string, rowId: string, input: UseInCardInput) {
  return apiRequest<unknown>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/use-in`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listTakenItemsRequest() {
  return apiRequest<{ items: TakenStockItem[] }>("/api/structured-inventory/taken-items");
}

export function returnTakenItemRequest(id: string) {
  return apiRequest<unknown>(`/api/structured-inventory/taken-items/${id}/return`, { method: "POST" });
}
```

Replace with:

```ts
export function consumeStructuredStockRowRequest(tableId: string, rowId: string, input: StockMovementInput) {
  return apiRequest<unknown>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/consume`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function borrowStructuredStockRowRequest(tableId: string, rowId: string, input: StockMovementInput) {
  return apiRequest<unknown>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/borrow`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function useStructuredStockRowInCardRequest(tableId: string, rowId: string, input: UseInCardInput) {
  return apiRequest<unknown>(`/api/structured-inventory/tables/${tableId}/rows/${rowId}/use-in`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listBorrowedItemsRequest() {
  return apiRequest<{ items: BorrowedItem[] }>("/api/structured-inventory/borrowed-items");
}

export function returnBorrowedItemRequest(id: string, quantity?: number) {
  return apiRequest<unknown>(`/api/structured-inventory/borrowed-items/${id}/return`, {
    method: "POST",
    body: quantity ? JSON.stringify({ quantity }) : undefined,
  });
}
```

- [ ] **Step 4: Create `client/src/services/borrow-requests.service.ts`**

```ts
import { apiRequest } from "./http";

export function createBorrowRequestRequest(borrowRecordId: string) {
  return apiRequest<unknown>("/api/borrow-requests", {
    method: "POST",
    body: JSON.stringify({ borrowRecordId }),
  });
}

export function acceptBorrowRequestRequest(id: string) {
  return apiRequest<unknown>(`/api/borrow-requests/${id}/accept`, { method: "POST" });
}

export function declineBorrowRequestRequest(id: string) {
  return apiRequest<unknown>(`/api/borrow-requests/${id}/decline`, { method: "POST" });
}

export function cancelBorrowRequestRequest(id: string) {
  return apiRequest<unknown>(`/api/borrow-requests/${id}/cancel`, { method: "POST" });
}
```

- [ ] **Step 5: Verify**

```bash
cd client && npm run lint
```

Expected: new type errors will surface in `TakenItemsWidget.tsx`, `TakenItemsPage.tsx`, `StockRowMovementModal.tsx`, `DashboardPage.tsx` (all still reference the removed `TakenStockItem`/`takeStructuredStockRowRequest`/etc.) — expected, fixed in Tasks 10-13.

- [ ] **Step 6: Commit**

```bash
git add client/src/types/structured-inventory.ts client/src/services/structured-inventory.service.ts client/src/services/borrow-requests.service.ts
git commit -m "feat(client): BorrowedItem type, consume/borrow/borrow-requests services"
```

---

### Task 10: Shared `BorrowRecordActions` component (Return/Request/Accept/Decline/Cancel)

This is extracted as its own component (rather than duplicated in the widget and the full page) so both call sites share one implementation of the permission logic and API calls — DRY, per the design spec's permission table.

**Files:**
- Create: `client/src/components/structured-inventory/BorrowRecordActions.tsx`

**Interfaces:**
- Consumes: `BorrowedItem` type (Task 9); `returnBorrowedItemRequest` (Task 9, `structured-inventory.service.ts`); `createBorrowRequestRequest`, `acceptBorrowRequestRequest`, `declineBorrowRequestRequest`, `cancelBorrowRequestRequest` (Task 9, `borrow-requests.service.ts`); `useAuth()` hook (existing, `client/src/hooks/useAuth.ts`, returns `{ user: { id, role, ... } | null }`).
- Produces: `<BorrowRecordActions item={BorrowedItem} onChanged={() => void} />` — consumed by Task 11 (dashboard widget) and Task 12 (full page).

- [ ] **Step 1: Create `BorrowRecordActions.tsx`**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  acceptBorrowRequestRequest,
  cancelBorrowRequestRequest,
  createBorrowRequestRequest,
  declineBorrowRequestRequest,
} from "../../services/borrow-requests.service";
import { returnBorrowedItemRequest } from "../../services/structured-inventory.service";
import { useAuth } from "../../hooks/useAuth";
import type { BorrowedItem } from "../../types/structured-inventory";

export function BorrowRecordActions({ item, onChanged }: { item: BorrowedItem; onChanged: () => void }) {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(item.quantity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHolder = item.currentHolder?.id === user?.id;
  const canResolve = isHolder || user?.role === "admin" || user?.role === "manager";

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("borrowedItems.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (item.pendingRequest) {
    const pendingRequest = item.pendingRequest;
    const isRequester = pendingRequest.requesterId === user?.id;
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-amber-300">
          {t("borrowedItems.requestedBy", { name: pendingRequest.requesterName })}
        </span>
        <div className="flex gap-2">
          {isRequester ? (
            <ActionButton busy={busy} label={t("borrowedItems.cancelRequest")} onClick={() => void run(() => cancelBorrowRequestRequest(pendingRequest.id))} />
          ) : null}
          {!isRequester && canResolve ? (
            <>
              <ActionButton busy={busy} label={t("borrowedItems.accept")} onClick={() => void run(() => acceptBorrowRequestRequest(pendingRequest.id))} />
              <ActionButton busy={busy} label={t("borrowedItems.decline")} onClick={() => void run(() => declineBorrowRequestRequest(pendingRequest.id))} />
            </>
          ) : null}
        </div>
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    );
  }

  if (isHolder) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            className="w-16 rounded-md border border-line bg-slate-950/70 px-2 py-1 text-xs text-white"
            max={item.quantity}
            min={1}
            onChange={(event) => setQuantity(Number(event.target.value || 1))}
            type="number"
            value={quantity}
          />
          <ActionButton busy={busy} label={t("borrowedItems.return")} onClick={() => void run(() => returnBorrowedItemRequest(item.id, quantity))} />
        </div>
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ActionButton busy={busy} label={t("borrowedItems.request")} onClick={() => void run(() => createBorrowRequestRequest(item.id))} />
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}

function ActionButton({ busy, label, onClick }: { busy: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-accent hover:text-accent disabled:opacity-50"
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {busy ? "…" : label}
    </button>
  );
}
```

Note on `canResolve`: the client shows Accept/Decline to any `admin` or `manager` (not just managers of *this specific* table), while the server's `authorizeResolver` (Task 7) enforces the real per-table scoping via `isTableManager`. A manager who isn't actually responsible for this table will see the buttons but get a 403 (surfaced via the `error` state above) if they click — this avoids needing a new "which tables do I manage" client-side lookup just for button visibility, while the server remains the actual authority.

- [ ] **Step 2: Verify**

```bash
cd client && npm run lint
```

Expected: this new file compiles clean (nothing imports it yet).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/structured-inventory/BorrowRecordActions.tsx
git commit -m "feat(client): shared BorrowRecordActions component"
```

---

### Task 11: `StockRowMovementModal` — replace the Take tab with Consume + Borrow tabs

**Files:**
- Modify: `client/src/components/structured-inventory/StockRowMovementModal.tsx`

**Interfaces:**
- Produces: `<StockRowMovementModal row onClose onConsume onBorrow onUseIn />` (was `onTake`/`onUseIn`) — consumed by Task 12's `DashboardPage.tsx` wiring.

- [ ] **Step 1: Rewrite `StockRowMovementModal.tsx`**

Replace the entire file with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listUsedInCardsRequest } from "../../services/used-in.service";
import type { StockMovementInput, StructuredStockRow, UseInCardInput } from "../../types/structured-inventory";
import type { UsedInCard } from "../../types/used-in";

type Mode = "consume" | "borrow" | "use_in";

export function StockRowMovementModal({
  onClose,
  onConsume,
  onBorrow,
  onUseIn,
  row,
}: {
  onClose: () => void;
  onConsume: (rowId: string, input: StockMovementInput) => Promise<void>;
  onBorrow: (rowId: string, input: StockMovementInput) => Promise<void>;
  onUseIn: (rowId: string, input: UseInCardInput) => Promise<void>;
  row: StructuredStockRow | null;
}) {
  const { t } = useTranslation("inventory");
  const [cards, setCards] = useState<UsedInCard[]>([]);
  const [mode, setMode] = useState<Mode>("consume");
  const [quantity, setQuantity] = useState(1);
  const [cardId, setCardId] = useState("");
  const [spotIds, setSpotIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedCard = cards.find((card) => card.id === cardId) ?? null;
  const emptySpots = useMemo(() => selectedCard?.spots.filter((spot) => !spot.isOccupied) ?? [], [selectedCard]);

  useEffect(() => {
    if (!row) return;
    listUsedInCardsRequest().then((result) => {
      setCards(result.cards);
      setCardId(result.cards[0]?.id ?? "");
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : t("movement.usedInCard")));
  }, [row]);

  if (!row) return null;
  const activeRow = row;

  async function submit() {
    setError(null);
    if (quantity > activeRow.quantity) return setError(t("movement.onlyAvailable", { qty: activeRow.quantity, unit: activeRow.unit }));
    if (mode === "use_in" && !cardId) return setError(t("movement.selectCard"));
    if (mode === "use_in" && selectedCard?.spots.length && spotIds.length !== quantity) {
      return setError(t("movement.selectSpots", { count: quantity }));
    }
    setIsSaving(true);
    try {
      if (mode === "consume") await onConsume(activeRow.id, { quantity });
      if (mode === "borrow") await onBorrow(activeRow.id, { quantity });
      if (mode === "use_in") await onUseIn(activeRow.id, { quantity, cardId, spotIds });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("movement.movementFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <section className="w-full max-w-xl rounded-lg border border-line bg-slate-950 p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t("movement.sectionLabel")}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{activeRow.item.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{t("movement.available", { qty: activeRow.quantity, unit: activeRow.unit })}</p>
          </div>
          <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300" onClick={onClose} type="button"><X size={18} /></button>
        </header>
        {error ? <div className="mt-4 rounded border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
        <div className="mt-5 grid gap-3">
          <ModeTabs mode={mode} onChange={setMode} />
          <NumberField label={t("movement.quantity")} onChange={setQuantity} value={quantity} />
          {mode === "use_in" ? <CardFields cards={cards} cardId={cardId} emptySpots={emptySpots} quantity={quantity} selected={spotIds} setCardId={setCardId} setSelected={setSpotIds} /> : null}
        </div>
        <footer className="mt-5 flex justify-end gap-2">
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-200" onClick={onClose} type="button">{t("movement.cancel")}</button>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isSaving} onClick={() => void submit()} type="button">
            {modeLabel(mode, t)}
          </button>
        </footer>
      </section>
    </div>
  );
}

function modeLabel(mode: Mode, t: (key: string) => string) {
  if (mode === "consume") return t("movement.consume");
  if (mode === "borrow") return t("movement.borrow");
  return t("movement.useIn");
}

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { t } = useTranslation("inventory");
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {(["consume", "borrow", "use_in"] as const).map((option) => (
        <button className={`rounded-md border px-3 py-2 text-sm font-semibold ${mode === option ? "border-accent bg-accent/15 text-accent" : "border-line text-slate-300"}`} key={option} onClick={() => onChange(option)} type="button">
          {modeLabel(option, t)}
        </button>
      ))}
    </div>
  );
}

function CardFields({ cardId, cards, emptySpots, quantity, selected, setCardId, setSelected }: {
  cardId: string;
  cards: UsedInCard[];
  emptySpots: UsedInCard["spots"];
  quantity: number;
  selected: string[];
  setCardId: (value: string) => void;
  setSelected: (value: string[]) => void;
}) {
  const { t } = useTranslation("inventory");
  return (
    <>
      <SelectField label={t("movement.usedInCard")} onChange={(value) => { setCardId(value); setSelected([]); }} options={cards.map((card) => ({ label: card.name, value: card.id }))} value={cardId} />
      {emptySpots.length > 0 ? Array.from({ length: quantity }).map((_, index) => (
        <SelectField
          key={index}
          label={t("movement.spot", { index: index + 1 })}
          onChange={(value) => setSelected(selected.map((spotId, spotIndex) => spotIndex === index ? value : spotId).concat(index >= selected.length ? [value] : []).slice(0, quantity))}
          options={emptySpots.filter((spot) => !selected.includes(spot.id) || selected[index] === spot.id).map((spot) => ({ label: spot.name, value: spot.id }))}
          value={selected[index] ?? ""}
        />
      )) : null}
    </>
  );
}

function NumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <input className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" min={1} onChange={(event) => onChange(Number(event.target.value || 1))} type="number" value={value} />
    </label>
  );
}

function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: { label: string; value: string }[]; value: string }) {
  const { t } = useTranslation("inventory");
  return (
    <label>
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <select className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">{t("movement.select")}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Verify**

```bash
cd client && npm run lint
```

Expected: `StockRowMovementModal.tsx` compiles clean. Its only caller, `DashboardPage.tsx`, will now show a type error (still passes `onTake`) — fixed in Task 12.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/structured-inventory/StockRowMovementModal.tsx
git commit -m "feat(client): movement modal — Consume/Borrow tabs replace Take"
```

---

### Task 12: `BorrowedItemsWidget` (replaces `TakenItemsWidget`) + `DashboardPage` wiring

**Files:**
- Create: `client/src/components/dashboard/BorrowedItemsWidget.tsx`
- Delete: `client/src/components/dashboard/TakenItemsWidget.tsx`
- Modify: `client/src/pages/DashboardPage.tsx`

**Interfaces:**
- Consumes: `listBorrowedItemsRequest` (Task 9), `BorrowRecordActions` (Task 10), `BorrowedItem` type (Task 9), `consumeStructuredStockRowRequest`/`borrowStructuredStockRowRequest` (Task 9), `StockRowMovementModal` with `onConsume`/`onBorrow` props (Task 11).
- Produces: `<BorrowedItemsWidget />` rendered for **all** authenticated roles (not just employee) — visible on `/dashboard`.

- [ ] **Step 1: Create `client/src/components/dashboard/BorrowedItemsWidget.tsx`**

```tsx
import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BorrowRecordActions } from "../structured-inventory/BorrowRecordActions";
import { listBorrowedItemsRequest } from "../../services/structured-inventory.service";
import type { BorrowedItem } from "../../types/structured-inventory";

export function BorrowedItemsWidget() {
  const { t } = useTranslation("dashboard");
  const [items, setItems] = useState<BorrowedItem[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    listBorrowedItemsRequest()
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-slate-400" />
          <h2 className="font-semibold text-white">{t("borrowedItems.title")}</h2>
          {items.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 5 && (
          <Link className="text-xs text-slate-400 hover:text-accent" to="/borrowed-items">
            {t("borrowedItems.viewAll")}
          </Link>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500">{t("managerTables.loading")}</p>}

      {!loading && items.length === 0 && (
        <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
          {t("borrowedItems.empty")}
        </p>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <BorrowedItemRow item={item} key={item.id} onChanged={load} />
          ))}
          {items.length > 5 && (
            <p className="text-center text-xs text-slate-500">
              {t("borrowedItems.more", { count: items.length - 5 })}{" "}
              <Link className="text-accent hover:underline" to="/borrowed-items">
                {t("borrowedItems.viewAllLink")}
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function BorrowedItemRow({ item, onChanged }: { item: BorrowedItem; onChanged: () => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{item.sourceRow.item.name}</p>
        <p className="text-xs text-slate-500">
          {item.sourceTable.name} · {t("borrowedItems.qty")} {item.quantity} ·{" "}
          {t("borrowedItems.holder", { name: item.currentHolder?.name ?? t("borrowedItems.unknownHolder") })} ·{" "}
          {formatTimeAgo(new Date(item.createdAt))}
        </p>
      </div>
      <BorrowRecordActions item={item} onChanged={onChanged} />
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
```

- [ ] **Step 2: Delete `client/src/components/dashboard/TakenItemsWidget.tsx`**

```bash
git rm client/src/components/dashboard/TakenItemsWidget.tsx
```

- [ ] **Step 3: Update `client/src/pages/DashboardPage.tsx`**

Find:

```tsx
import { TakenItemsWidget } from "../components/dashboard/TakenItemsWidget";
```

Replace with:

```tsx
import { BorrowedItemsWidget } from "../components/dashboard/BorrowedItemsWidget";
```

Find:

```tsx
import {
  getStructuredStockRowRequest,
  takeStructuredStockRowRequest,
  updateStructuredStockRowRequest,
  useStructuredStockRowInCardRequest,
} from "../services/structured-inventory.service";
```

Replace with:

```tsx
import {
  borrowStructuredStockRowRequest,
  consumeStructuredStockRowRequest,
  getStructuredStockRowRequest,
  updateStructuredStockRowRequest,
  useStructuredStockRowInCardRequest,
} from "../services/structured-inventory.service";
```

Find:

```tsx
      {isEmployee && (
        <Widget>
          <TakenItemsWidget />
        </Widget>
      )}

      {/* Visible to every role; self-hides when the user has no reported issues. */}
      <MyReportedIssuesWidget onIssueClick={handleIssueClick} />
```

Replace with:

```tsx
      {/* Visible to every role — matches "members can see borrowed items" requirement. */}
      <Widget>
        <BorrowedItemsWidget />
      </Widget>

      {/* Visible to every role; self-hides when the user has no reported issues. */}
      <MyReportedIssuesWidget onIssueClick={handleIssueClick} />
```

Find:

```tsx
      <StockRowMovementModal
        row={movingRow}
        onClose={() => {
          setMovingRow(null);
          setMovingTableId(null);
        }}
        onTake={(rowId, input) => {
          if (!movingTableId) return Promise.resolve();
          return takeStructuredStockRowRequest(movingTableId, rowId, input).then(() => undefined);
        }}
        onUseIn={(rowId, input) => {
          if (!movingTableId) return Promise.resolve();
          return useStructuredStockRowInCardRequest(movingTableId, rowId, input).then(() => undefined);
        }}
      />
```

Replace with:

```tsx
      <StockRowMovementModal
        row={movingRow}
        onClose={() => {
          setMovingRow(null);
          setMovingTableId(null);
        }}
        onConsume={(rowId, input) => {
          if (!movingTableId) return Promise.resolve();
          return consumeStructuredStockRowRequest(movingTableId, rowId, input).then(() => undefined);
        }}
        onBorrow={(rowId, input) => {
          if (!movingTableId) return Promise.resolve();
          return borrowStructuredStockRowRequest(movingTableId, rowId, input).then(() => undefined);
        }}
        onUseIn={(rowId, input) => {
          if (!movingTableId) return Promise.resolve();
          return useStructuredStockRowInCardRequest(movingTableId, rowId, input).then(() => undefined);
        }}
      />
```

Note: `isEmployee` remains used elsewhere in this file (`canTakeReturn = isAdmin || isManager || isEmployee`, gating the QR scanner's move permission) — do not remove that variable.

- [ ] **Step 4: Verify**

```bash
cd client && npm run lint
```

Expected: `DashboardPage.tsx` compiles clean.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/dashboard/BorrowedItemsWidget.tsx client/src/pages/DashboardPage.tsx
git commit -m "feat(client): BorrowedItemsWidget replaces TakenItemsWidget, visible to all roles"
```

---

### Task 13: `BorrowedItemsPage` (replaces `TakenItemsPage`) + router/sidebar/landing-page routes

**Files:**
- Create: `client/src/pages/BorrowedItemsPage.tsx`
- Delete: `client/src/pages/TakenItemsPage.tsx`
- Modify: `client/src/app/router.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/constants/landing.ts`
- Modify: `server/src/modules/profile/landing.ts`

**Interfaces:**
- Consumes: `listBorrowedItemsRequest` (Task 9), `BorrowRecordActions` (Task 10), `BorrowedItem` type (Task 9), `labelForSettings`/`renderStockCell`/`selectedColumnsFromSettings` (existing exports of `StructuredStockRowsTable.tsx`, unchanged).
- Produces: route `/borrowed-items` (replaces `/taken-items`) reachable from the sidebar and selectable as a landing page.

- [ ] **Step 1: Create `client/src/pages/BorrowedItemsPage.tsx`**

```tsx
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BorrowRecordActions } from "../components/structured-inventory/BorrowRecordActions";
import { listBorrowedItemsRequest } from "../services/structured-inventory.service";
import { labelForSettings, renderStockCell, selectedColumnsFromSettings } from "../components/structured-inventory/StructuredStockRowsTable";
import type { BorrowedItem, TableColumnSettings } from "../types/structured-inventory";

export function BorrowedItemsPage() {
  const { t } = useTranslation("borrowed");
  const [items, setItems] = useState<BorrowedItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loadItems() {
    listBorrowedItemsRequest()
      .then((result) => {
        setItems(result.items);
        setError(null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : t("error.unavailable")));
  }

  useEffect(loadItems, []);

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? items.filter((item) => {
        const cols = selectedColumnsFromSettings(item.sourceTable.columnSettings);
        const cellValues = cols.map((col) => String(renderStockCell(item.sourceRow, col) ?? "").toLowerCase());
        return (
          item.sourceTable.name.toLowerCase().includes(q) ||
          (item.currentHolder?.name.toLowerCase().includes(q) ?? false) ||
          cellValues.some((value) => value.includes(q))
        );
      })
    : items;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("sectionLabel")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("title")}</h1>
      </header>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.04] px-3 py-2">
        <Search className="shrink-0 text-slate-500" size={16} />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          value={search}
        />
      </div>
      {error ? <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</section> : null}
      {filteredItems.length === 0 ? (
        <section className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
          {items.length === 0 ? t("empty.noItems") : t("empty.noMatch")}
        </section>
      ) : null}
      {itemsByTable(filteredItems).map((group) => <BorrowedTable group={group} key={group.tableId} onChanged={loadItems} />)}
    </div>
  );
}

function BorrowedTable({ group, onChanged }: {
  group: { tableId: string; tableName: string; items: BorrowedItem[]; columns: TableColumnSettings };
  onChanged: () => void;
}) {
  const { t } = useTranslation("borrowed");
  const columns = selectedColumnsFromSettings(group.columns);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{group.tableName}</h2>
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {columns.map((column) => <th className="px-4 py-3" key={column}>{labelForSettings(column, group.columns)}</th>)}
              <th className="px-4 py-3">{t("table.quantity")}</th>
              <th className="px-4 py-3">{t("table.holder")}</th>
              <th className="px-4 py-3">{t("table.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {group.items.map((item) => (
              <tr className="text-slate-200" key={item.id}>
                {columns.map((column) => <td className="max-w-64 truncate px-4 py-3" key={column}>{renderStockCell(item.sourceRow, column)}</td>)}
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{item.currentHolder?.name ?? t("table.unknownHolder")}</td>
                <td className="px-4 py-3"><BorrowRecordActions item={item} onChanged={onChanged} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function itemsByTable(items: BorrowedItem[]) {
  const groups = new Map<string, { tableId: string; tableName: string; items: BorrowedItem[]; columns: TableColumnSettings }>();
  for (const item of items) {
    const current = groups.get(item.sourceTable.id) ?? { tableId: item.sourceTable.id, tableName: item.sourceTable.name, items: [], columns: item.sourceTable.columnSettings };
    current.items.push(item);
    groups.set(item.sourceTable.id, current);
  }
  return Array.from(groups.values());
}
```

- [ ] **Step 2: Delete `client/src/pages/TakenItemsPage.tsx`**

```bash
git rm client/src/pages/TakenItemsPage.tsx
```

- [ ] **Step 3: `client/src/app/router.tsx`**

Find the `TakenItemsPage` import (alongside the other page imports near the top of the file) and replace it:

```tsx
import { TakenItemsPage } from "../pages/TakenItemsPage";
```

Replace with:

```tsx
import { BorrowedItemsPage } from "../pages/BorrowedItemsPage";
```

Find:

```tsx
          <Route element={<TakenItemsPage />} path="/taken-items" />
```

Replace with:

```tsx
          <Route element={<BorrowedItemsPage />} path="/borrowed-items" />
```

- [ ] **Step 4: `client/src/components/layout/Sidebar.tsx`**

Find:

```tsx
    { label: t("takenItems"), href: "/taken-items", icon: PackageMinus },
```

Replace with:

```tsx
    { label: t("borrowedItems"), href: "/borrowed-items", icon: PackageMinus },
```

- [ ] **Step 5: `client/src/constants/landing.ts`**

Find:

```ts
  { path: "/taken-items", label: "Taken Items", icon: Truck },
```

Replace with:

```ts
  { path: "/borrowed-items", label: "Borrowed Items", icon: Truck },
```

- [ ] **Step 6: `server/src/modules/profile/landing.ts`** (the server-side allowlist that "must stay in sync with the client", per its own comment)

Find:

```ts
export const LANDING_PAGE_ROUTES = [
  "/dashboard",
  "/inventory",
  "/used-in",
  "/taken-items",
  "/warehouses",
  "/locations",
  "/machines",
  "/tools",
  "/profile",
] as const;
```

Replace with:

```ts
export const LANDING_PAGE_ROUTES = [
  "/dashboard",
  "/inventory",
  "/used-in",
  "/borrowed-items",
  "/warehouses",
  "/locations",
  "/machines",
  "/tools",
  "/profile",
] as const;
```

Note: any user who had previously saved `/taken-items` as their landing page will have a `landingPath` value no longer in this allowlist. `resolveLandingPath` (unchanged, in this same file) already falls back to `DEFAULT_LANDING_PATH` for any `landingPath` that fails `isLandingPageRoute` — this degrades gracefully with no extra migration needed, consistent with how the existing "stale landing page" handling already works for deleted groups/tables.

- [ ] **Step 7: Verify**

```bash
cd client && npm run lint && cd ../server && npm run lint
```

Expected: both clean.

```bash
grep -rn "taken-items\|TakenItemsPage\|TakenItemsWidget" client/src server/src
```

Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/BorrowedItemsPage.tsx client/src/app/router.tsx client/src/components/layout/Sidebar.tsx client/src/constants/landing.ts server/src/modules/profile/landing.ts
git commit -m "feat(client,server): /borrowed-items page + route, replace /taken-items everywhere"
```

---

### Task 14: i18n — `en` + `sv` locale updates

**Files:**
- Modify: `client/src/i18n/locales/en/dashboard.json`
- Modify: `client/src/i18n/locales/sv/dashboard.json`
- Create: `client/src/i18n/locales/en/borrowed.json`
- Create: `client/src/i18n/locales/sv/borrowed.json`
- Delete: `client/src/i18n/locales/en/taken.json`
- Delete: `client/src/i18n/locales/sv/taken.json`
- Modify: `client/src/i18n/locales/en/inventory.json`
- Modify: `client/src/i18n/locales/sv/inventory.json`
- Modify: `client/src/i18n/locales/en/navigation.json`
- Modify: `client/src/i18n/locales/sv/navigation.json`

**Interfaces:**
- Produces: i18n keys `dashboard:borrowedItems.*` (consumed by Task 12's widget and Task 10's `BorrowRecordActions`), `borrowed:*` (consumed by Task 13's page), `inventory:movement.consume`/`movement.borrow` (consumed by Task 11's modal), `inventory:history.actions.consume`/`.borrow` (consumed by the existing, unchanged `StockRowHistory.tsx`, which does a dynamic `t(\`history.actions.${action}\`)` lookup), `navigation:borrowedItems` (consumed by Task 13's sidebar edit).

- [ ] **Step 1: `client/src/i18n/locales/en/dashboard.json`** — rename `takenItems` to `borrowedItems`

Find:

```json
  "takenItems": {
    "title": "Items I've Taken Out",
    "empty": "No items currently taken out.",
    "viewAll": "View all →",
    "viewAllLink": "view all",
    "more": "+{{count}} more —",
    "qty": "Qty:",
    "return": "Return"
  },
```

Replace with:

```json
  "borrowedItems": {
    "title": "Borrowed Items",
    "empty": "No items currently borrowed.",
    "viewAll": "View all →",
    "viewAllLink": "view all",
    "more": "+{{count}} more —",
    "qty": "Qty:",
    "holder": "Held by {{name}}",
    "unknownHolder": "Unknown",
    "return": "Return",
    "request": "Request",
    "requestedBy": "Requested by {{name}}",
    "accept": "Accept",
    "decline": "Decline",
    "cancelRequest": "Cancel request",
    "actionFailed": "Action failed"
  },
```

- [ ] **Step 2: `client/src/i18n/locales/sv/dashboard.json`** — same rename, Swedish text

Find:

```json
  "takenItems": {
    "title": "Uttagna artiklar",
    "empty": "Inga artiklar uttagna.",
    "viewAll": "Visa alla →",
    "viewAllLink": "visa alla",
    "more": "+{{count}} till —",
    "qty": "Antal:",
    "return": "Återlämna"
  },
```

Replace with:

```json
  "borrowedItems": {
    "title": "Lånade artiklar",
    "empty": "Inga artiklar är för närvarande lånade.",
    "viewAll": "Visa alla →",
    "viewAllLink": "visa alla",
    "more": "+{{count}} till —",
    "qty": "Antal:",
    "holder": "Innehas av {{name}}",
    "unknownHolder": "Okänd",
    "return": "Återlämna",
    "request": "Begär",
    "requestedBy": "Begärd av {{name}}",
    "accept": "Acceptera",
    "decline": "Avböj",
    "cancelRequest": "Avbryt begäran",
    "actionFailed": "Åtgärden misslyckades"
  },
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/borrowed.json`** (replaces `taken.json`)

```json
{
  "sectionLabel": "Borrowed items",
  "title": "Borrowed items",
  "search": "Search by table, item name, holder, location...",
  "empty": {
    "noItems": "No items are currently borrowed.",
    "noMatch": "No items match your search."
  },
  "table": {
    "quantity": "Quantity",
    "holder": "Holder",
    "unknownHolder": "Unknown",
    "action": "Action"
  },
  "error": {
    "unavailable": "Borrowed items unavailable"
  }
}
```

- [ ] **Step 4: Create `client/src/i18n/locales/sv/borrowed.json`**

```json
{
  "sectionLabel": "Lånade artiklar",
  "title": "Lånade artiklar",
  "search": "Sök efter tabell, artikelnamn, innehavare, plats...",
  "empty": {
    "noItems": "Inga artiklar är för tillfället lånade.",
    "noMatch": "Inga artiklar matchar din sökning."
  },
  "table": {
    "quantity": "Antal",
    "holder": "Innehavare",
    "unknownHolder": "Okänd",
    "action": "Åtgärd"
  },
  "error": {
    "unavailable": "Lånade artiklar är inte tillgängliga"
  }
}
```

- [ ] **Step 5: Delete the old `taken.json` files**

```bash
git rm client/src/i18n/locales/en/taken.json client/src/i18n/locales/sv/taken.json
```

- [ ] **Step 6: Register the new `borrowed` i18n namespace**

Find wherever the `taken` namespace is currently registered (the i18next init config lists all namespaces — search for `"taken"` in `client/src/i18n/` outside the `locales` folder, e.g. `client/src/i18n/index.ts` or `client/src/i18n/config.ts`). Replace the `"taken"` entry with `"borrowed"` in that namespace list/import map, following the exact same pattern used for every other namespace already registered there (e.g. `"dashboard"`, `"inventory"`).

- [ ] **Step 7: `client/src/i18n/locales/en/inventory.json`** — movement tabs + history action labels

Find:

```json
  "movement": {
    "sectionLabel": "Take out / Use in",
    "available": "Available: {{qty}} {{unit}}",
    "take": "Take",
    "useIn": "Use in",
```

Replace with:

```json
  "movement": {
    "sectionLabel": "Consume / Borrow / Use in",
    "available": "Available: {{qty}} {{unit}}",
    "consume": "Consume",
    "borrow": "Borrow",
    "useIn": "Use in",
```

Find:

```json
    "actions": {
      "add": "Added",
      "edit": "Edited",
      "archive": "Archived",
      "restore": "Restored",
      "delete": "Deleted",
      "take": "Taken out",
      "return": "Returned",
      "use_in": "Used in card",
      "return_used": "Returned from card"
    }
```

Replace with:

```json
    "actions": {
      "add": "Added",
      "edit": "Edited",
      "archive": "Archived",
      "restore": "Restored",
      "delete": "Deleted",
      "take": "Taken out",
      "consume": "Consumed",
      "borrow": "Borrowed",
      "return": "Returned",
      "use_in": "Used in card",
      "return_used": "Returned from card"
    }
```

(`"take": "Taken out"` is kept, not removed — the 7-day activity history can still show pre-rollout `ItemInteractionLog` rows logged with `action: "take"` before this migration; those historical log rows aren't rewritten, so the label needs to keep working for the remainder of their 7-day visibility window.)

- [ ] **Step 8: `client/src/i18n/locales/sv/inventory.json`** — same two edits, Swedish text

Find:

```json
  "movement": {
    "sectionLabel": "Ta ut / Använd i",
    "available": "Tillgängligt: {{qty}} {{unit}}",
    "take": "Ta ut",
    "useIn": "Använd i",
```

Replace with:

```json
  "movement": {
    "sectionLabel": "Förbruka / Låna / Använd i",
    "available": "Tillgängligt: {{qty}} {{unit}}",
    "consume": "Förbruka",
    "borrow": "Låna",
    "useIn": "Använd i",
```

Find:

```json
    "actions": {
      "add": "Tillagd",
      "edit": "Redigerad",
      "archive": "Arkiverad",
      "restore": "Återställd",
      "delete": "Borttagen",
      "take": "Uttagen",
      "return": "Återlämnad",
      "use_in": "Används i kort",
      "return_used": "Återlämnad från kort"
    }
```

Replace with:

```json
    "actions": {
      "add": "Tillagd",
      "edit": "Redigerad",
      "archive": "Arkiverad",
      "restore": "Återställd",
      "delete": "Borttagen",
      "take": "Uttagen",
      "consume": "Förbrukad",
      "borrow": "Lånad",
      "return": "Återlämnad",
      "use_in": "Används i kort",
      "return_used": "Återlämnad från kort"
    }
```

- [ ] **Step 9: `client/src/i18n/locales/en/navigation.json`**

Find:

```json
  "takenItems": "Taken Items",
```

Replace with:

```json
  "borrowedItems": "Borrowed Items",
```

- [ ] **Step 10: `client/src/i18n/locales/sv/navigation.json`**

Find:

```json
  "takenItems": "Uttagna artiklar",
```

Replace with:

```json
  "borrowedItems": "Lånade artiklar",
```

- [ ] **Step 11: Verify**

```bash
cd client && npm run lint && npm run build
```

Expected: both pass with zero errors — the whole `client/` workspace should now be clean, since this was the last task touching client code.

```bash
grep -rln "takenItems\|\"take\": \"Take\"" client/src/i18n/locales
```

Expected: no output (the only surviving `"take"` key should be `inventory.json`'s `history.actions.take`, which is intentional per Step 7's note — this grep pattern specifically targets the old `movement.take: "Take"` label and the old `takenItems` dashboard key, not the history-actions one).

- [ ] **Step 12: Commit**

```bash
git add client/src/i18n/locales
git commit -m "feat(i18n): borrowedItems/borrowed/consume/borrow strings, en+sv"
```

---

### Task 15: Full integration verification + `PLAN.md`

**Files:**
- Modify: `PLAN.md`

**Interfaces:** none — this is verification and documentation only.

- [ ] **Step 1: Full rebuild**

```bash
npm run lint && npm run build && npm run check:lines && docker compose up -d --build server client
```

Expected: all four steps pass. `npm run check:lines` in particular confirms no new/modified source file exceeds 350 lines (watch `BorrowRecordActions.tsx`, `BorrowedItemsWidget.tsx`, `BorrowedItemsPage.tsx`, `borrow-requests.service.ts` on the server — all were designed to land well under the limit, but re-check after any manual edits during implementation).

- [ ] **Step 2: Manual browser walkthrough** (no automated test suite exists in this repo — this is the actual verification gate, matching the project's established convention)

Using the running docker-compose stack, with at least two distinct logged-in users (one employee, one manager or admin) in two browser sessions/profiles:

1. As Employee A, open a stock row's movement modal. Confirm it shows **Consume / Borrow / Use in** (no "Take"). Consume 1 unit — confirm the row's quantity drops, no return option appears anywhere for it, and it shows up in the item's 7-day activity history as "Consumed".
2. As Employee A, Borrow 2 units of a different row. Confirm: the row's quantity drops by 2; the row itself shows a "x2 borrowed by Employee A" activity pill; the dashboard's Borrowed Items widget (visible without switching roles) shows the item with Employee A as holder and a Return control.
3. As Employee B (second session), open the dashboard. Confirm the same borrowed item is visible with a **Request** button (no Return button, since B isn't the holder). Click Request.
4. As Employee A, confirm the item now shows "Requested by Employee B" plus **Accept**/**Decline** buttons (A is the holder). Click Accept.
5. Confirm: the item's holder is now Employee B; as Employee A, the item no longer offers Accept/Decline/Return (A is no longer the holder and has no pending request); as Employee B, the item now shows a Return control.
6. As a Manager/Admin (third role, not the holder), confirm the borrowed items list is visible (read-only unless a request is pending) and that filing a *second* request while one is already pending is rejected with a clear message.
7. As Employee B (current holder), Return the full quantity. Confirm the item disappears from the active Borrowed Items list and the row's stock quantity increases back.
8. Visit `/borrowed-items` directly (was `/taken-items`) and confirm the full grouped-by-table list renders with the same actions as the dashboard widget.
9. In Admin Settings → user profile landing page picker, confirm "Borrowed Items" appears as an option (not "Taken Items").

- [ ] **Step 3: Append a phase entry to `PLAN.md`**

Locate the `## Phase Completion Log` section and append a new entry following the existing format (heading, `Created:`, `Changed:`, `Completed:`, `Verification:` bullets, matching the style of the most recent entries in that section):

```markdown
### Consume, Borrow & Borrow Requests

Created:
- `server/src/modules/borrow-requests/` (schemas, repository, service, controller, routes)
- `client/src/services/borrow-requests.service.ts`
- `client/src/components/structured-inventory/BorrowRecordActions.tsx`
- `client/src/components/dashboard/BorrowedItemsWidget.tsx`
- `client/src/pages/BorrowedItemsPage.tsx`
- `client/src/i18n/locales/{en,sv}/borrowed.json`
- `prisma/migrations/20260701120000_consume_borrow_requests/`

Changed:
- `prisma/schema.prisma` — retired `TakenStockItem`; added `ConsumedStockItem`, `BorrowRecord` (chainable via `previousBorrowRecordId`), `BorrowRequest`
- `server/src/modules/structured-inventory/*` — `take` replaced by `consume`+`borrow`; `/taken-items` replaced by `/borrowed-items`; row-level activity pills renamed from "taken" to "borrow"
- `server/src/app.ts` — mounted `/api/borrow-requests`
- `server/src/modules/profile/landing.ts`, `client/src/constants/landing.ts` — landing-page allowlist updated
- `client/src/app/router.tsx`, `client/src/components/layout/Sidebar.tsx` — `/taken-items` → `/borrowed-items`
- `client/src/components/structured-inventory/StockRowMovementModal.tsx` — Take tab split into Consume + Borrow tabs
- `client/src/pages/DashboardPage.tsx` — Borrowed Items widget now visible to all roles (was employee-only)
- i18n: `dashboard.json`, `inventory.json`, `navigation.json` (en+sv)

Completed:
- Consume: permanent stock decrement, no return path
- Borrow: temporary decrement with a named holder, partial/full self-return, split borrows (multiple concurrent holders per item)
- Borrow requests: request / accept / decline / cancel, whole-record transfer with a linked custody chain, single-winner race safety on accept/decline, current-holder-only approval rights after a transfer
- Data migration: every historical `TakenStockItem` row (open and returned) preserved as a `BorrowRecord`

Verification:
- `npm run lint && npm run build && npm run check:lines && docker compose up -d --build server client` — all pass
- Manual walkthrough per Task 15 Step 2 — consume, borrow, request, accept, return, and the `/borrowed-items` page all confirmed working across employee/manager roles
```

- [ ] **Step 4: Commit**

```bash
git add PLAN.md
git commit -m "docs: update PLAN.md — Consume/Borrow/Borrow Requests phase complete"
```

