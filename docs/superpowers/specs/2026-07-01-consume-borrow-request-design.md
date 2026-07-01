# Consume, Borrow & Borrow Requests — Design Spec
**Date:** 2026-07-01
**Status:** Draft
**Builds on:** structured-inventory take/use-in/return (existing), urgent-issues (pattern reference)

---

## Overview

Today, taking stock out of an `InventoryTable` has exactly one shape: **Take** (`takeStockItem` → `TakenStockItem`, decrement + returnable) alongside **Use In** (`useStockItemInCard` → `UsedInStockAssignment`, decrement + returnable, tied to a Used In card). Use In is untouched by this spec.

Take is retired and replaced by two distinct actions:

1. **Consume** — permanent removal. Decrements stock by a quantity (default 1, or a user-specified qty); no return path, ever. Replaces "I used this up."
2. **Borrow** — temporary removal, tied to a specific holder. Decrements stock; the holder can return some/all of it later; another user can request it from the current holder; the table manager, admin, or current holder can accept or decline that request, transferring custody.

Borrow is the more complex of the two because custody can move between people over time, and that history must stay legible (who has it now, who's asked for it, who held it before).

---

## Data model

### New enums

```prisma
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

### `ConsumedStockItem` (new — mirrors `TakenStockItem`, minus `returnedAt`)

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
```

No `returnedAt`, no status — a consume event is permanent and complete the moment it's written. Reporting/history queries just filter this table directly.

### `BorrowRecord` (new — replaces `TakenStockItem`'s outstanding-loan role)

```prisma
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
```

Key design point: **one `BorrowRecord` per independent loan.** The same item/`StockBalance` can have several *concurrently active* `BorrowRecord`s under different holders (split borrows) — e.g. qty 10 in stock, A borrows 3 (one record), B independently borrows 2 (a separate record), 5 remain available. Each record's `quantity` shrinks in place on a partial self-return; it closes (`status: returned`, `closedAt` set) when it reaches zero.

`previousBorrowRecordId` links a linear transfer chain (A → B → C). It's marked `@unique` so at most one record can claim a given predecessor, keeping the chain a simple linked list, never a tree. A transfer always moves the **whole** record's quantity (no splitting on transfer, per the "whole record only" decision) — the old record closes with `status: transferred`, a new one opens referencing it.

### `BorrowRequest` (new — modeled on `UrgentIssue`)

```prisma
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

`borrowRecordId` is deliberately **not** unique — a record can accumulate a history of requests over time (declined ones stay as rows; a later request is a new row). "Only one **pending** request per record at a time" is enforced at the service layer (a `findFirst({ where: { borrowRecordId, status: "pending" } })` check before creating), the same level of rigor the existing `UrgentIssue` module uses — no DB constraint, matching this codebase's existing pattern for human-paced approval workflows.

**Accept/decline race safety:** resolving a request is a single conditional update — `updateMany({ where: { id, status: "pending" }, data: { status: "accepted"|"declined", resolvedById, resolvedAt } })` — and the caller checks `count === 1` before doing the actual transfer. If the holder and a manager both click "accept" within the same instant, only one update matches `status: "pending"` and wins; the loser's request re-fetch shows it's already resolved and the UI surfaces "already handled by X."

### Retiring `TakenStockItem`

`TakenStockItem` is dropped. A single data migration folds its full history into `BorrowRecord` so nothing disappears:

```sql
INSERT INTO borrow_records (id, source_stock_balance_id, source_inventory_table_id, item_id, quantity, notes, status, current_holder_id, closed_at, created_at, updated_at)
SELECT id, source_stock_balance_id, source_inventory_table_id, item_id, quantity, notes,
       CASE WHEN returned_at IS NULL THEN 'active' ELSE 'returned' END,
       created_by_user_id, returned_at, created_at, updated_at
FROM taken_stock_items;

DROP TABLE taken_stock_items;
```

Every historical `TakenStockItem` row becomes a `BorrowRecord` (still-open loans stay `active` with their original holder; already-returned ones become `returned` with `closedAt` = the original `returnedAt`). No live loan silently vanishes, and past history is preserved under the new model rather than archived separately. Per the project's backup rules, take a `pg_dump` immediately before running this migration in production.

Migration file: `prisma/migrations/20260701120000_consume_borrow_requests/migration.sql` (adjust timestamp to actual run time).

---

## Backend

### `structured-inventory` module (stock-movement mechanics — Consume + Borrow lifecycle)

Borrow and Consume are stock movements, same family as Take/Use In, so they live alongside them:

- **`stock-movement.service.ts`**
  - Remove `takeStockItem`, `getTakenItems`, `returnTakenItem`.
  - Add `consumeStockItem(tableId, rowId, input, userId)`: reuses `loadAvailableRow` (already rejects qty > available), `decrementStock(tx, row, qty, "consume", userId)`, creates a `ConsumedStockItem` row, logs `action: "consume"`, calls `evaluateLowStock`. No return path — nothing else.
  - Add `borrowStockItem(tableId, rowId, input, userId)`: same shape as old `takeStockItem`, creates a `BorrowRecord` with `currentHolderId: userId`, `status: "active"`, logs `action: "borrow"`.
  - Add `getBorrowedItems()`: lists all `status: "active"` `BorrowRecord`s (global, not scoped to the requesting user — matches today's `listActiveTakenItems` behavior), each including its current pending `BorrowRequest` (if any) so the list view can show "requested by X" inline.
  - Add `returnBorrowedItem(id, quantity, userId)`: **only the current holder** may call this (403 otherwise — explicitly out of scope for this spec: managers/admins cannot force-reclaim outside the request flow, only accept a transfer). Supports partial return: if `quantity < record.quantity`, decrement `record.quantity` in place and `incrementStock` for the returned amount only; if it fully zeroes out, set `status: "returned"`, `closedAt: now()`. If a `pending` `BorrowRequest` exists on this record when it's fully returned, auto-resolve it to `cancelled` (nothing left to hand over).
- **`stock-movement-records.ts`**: replace `findTakenItem`/`listActiveTakenItems` with `findBorrowRecord`/`listActiveBorrowRecords` (same shape, new model); add `findActiveConsumedItem`-style helpers only if reporting needs them (none requested — skip for now).
- **`stock-movement.serializer.ts`**: replace `serializeTakenItem` with `serializeBorrowRecord` (adds `currentHolder: {id, name}`, `pendingRequest: {id, requesterId, requesterName, createdAt} | null`); add `serializeConsumedItem` only if a consume-history endpoint is added later (not in this scope — consume events remain visible via the existing item movement/interaction history, same as Use In today has no dedicated widget).
- **`structured-inventory.schemas.ts`**: `stockMovementActionSchema` (quantity, notes) is reused unchanged for both Consume and Borrow — no new schema needed there. Add `returnBorrowInputSchema = { quantity: optional int min 1 }` (defaults to the record's full remaining quantity when omitted).
- **`structured-inventory.routes.ts`**: replace `/rows/:rowId/take` → `/rows/:rowId/consume` and add `/rows/:rowId/borrow` (both under the existing `canTakeReturn = requireRoles(admin, manager, employee)` — viewers stay read-only, matching current Take/Use In access). Replace `/taken-items` (GET) → `/borrowed-items` (GET, open to **all authenticated roles including viewer** — it's read-only visibility, matching the "members can see it" requirement). Replace `/taken-items/:id/return` → `/borrowed-items/:id/return` (`canTakeReturn`).

### New `borrow-requests` module (approval workflow — mirrors `urgent-issues` module shape)

A separate module because its authorization logic (holder OR table-manager OR admin) and lifecycle (pending/accepted/declined/cancelled) is a workflow concern, not a stock-movement concern — same reasoning that gave `urgent-issues` its own module even though it references `StockBalance`.

- **`borrow-requests.schemas.ts`**: `createBorrowRequestSchema = { borrowRecordId: cuid }`.
- **`borrow-requests.repository.ts`**: `createRequest`, `findPendingRequestForRecord`, `findRequestWithRecord(id)`, `resolveRequest(id, status, resolvedById)` (the conditional `updateMany` described above), `transferBorrowRecord(tx, oldRecord, newHolderId)` (closes old as `transferred`, creates the linked new `active` record).
- **`borrow-requests.service.ts`**:
  - `requestBorrow(borrowRecordId, requesterId)`: 404 if record missing/not active; 400 if requester is already the current holder ("you already have this"); 400 if a pending request already exists on this record ("already requested by X").
  - `acceptRequest(requestId, actorId, actorRole)`: loads the request + record; authorizes actor as current holder OR `isTableManager(actorId, record.sourceInventoryTableId)` OR `actorRole === "admin"` (403 otherwise — note this is **not** the original borrower once transferred away, per the "current holder only" decision); resolves the request atomically, then calls `transferBorrowRecord`.
  - `declineRequest(requestId, actorId, actorRole)`: same authorization; atomic resolve to `declined`.
  - `cancelRequest(requestId, requesterId)`: requester-only, atomic resolve to `cancelled` (lets someone withdraw their own request — natural complement to decline, needed so "one open request at a time" doesn't strand a requester who changed their mind).
- **`borrow-requests.controller.ts` / `.routes.ts`**: `POST /api/borrow-requests` (create, `canTakeReturn` roles), `POST /api/borrow-requests/:id/accept`, `POST /api/borrow-requests/:id/decline` (both: any authenticated non-viewer role, authorization enforced inside the service, not the route), `POST /api/borrow-requests/:id/cancel` (requester only, enforced in service).

---

## Frontend

- **`client/src/services/structured-inventory.service.ts`**: remove `takeStructuredStockRowRequest`, `listTakenItemsRequest`, `returnTakenItemRequest`; add `consumeStructuredStockRowRequest`, `borrowStructuredStockRowRequest`, `listBorrowedItemsRequest`, `returnBorrowedItemRequest(id, quantity?)`.
- **New `client/src/services/borrow-requests.service.ts`**: `createBorrowRequestRequest(borrowRecordId)`, `acceptBorrowRequestRequest(id)`, `declineBorrowRequestRequest(id)`, `cancelBorrowRequestRequest(id)`.
- **Types**: replace `TakenStockItem` (in `client/src/types/structured-inventory.ts`) with `ConsumedStockItem` and `BorrowedItem` (adds `currentHolder: {id, name}`, `pendingRequest: {id, requesterId, requesterName, createdAt} | null`). New `client/src/types/borrow-requests.ts` for the request shape.
- **`StockRowMovementModal`**: today wires a single "Take" action plus "Use In"; replace with **Consume** and **Borrow** as two distinct actions (same quantity/notes fields as today, just routed to the new endpoints).
- **`TakenItemsWidget.tsx` → `BorrowedItemsWidget.tsx`** (renamed, same 125-line shape, extended):
  - Row shows item, table, qty, **current holder name**, "borrowed since" (per the agreed dashboard-field set).
  - **Return** button: visible only when the viewing user *is* the current holder; supports returning less than the full quantity (a small qty input next to the button, defaulting to the full amount).
  - **Request** button: visible when the viewing user is *not* the current holder and there's no pending request yet; calls `createBorrowRequestRequest`.
  - When a `pendingRequest` exists: show "Requested by {name}"; if the viewing user is the current holder, table manager, or admin, show **Accept**/**Decline** buttons; if the viewing user is the requester, show a **Cancel** option instead.
  - File stays under 350 lines; if the accept/decline/request sub-UI pushes it over, extract a `BorrowedItemRow.tsx` component (same split pattern the spec for sub-project B used for `ReportedIssueCard`).
- **`TakenItemsPage.tsx` → `BorrowedItemsPage.tsx`**: same full-list page, same rename, extended with the same request/accept/decline affordances as the widget.
- **`DashboardPage.tsx`**: move `<BorrowedItemsWidget />` out of the `isEmployee`-only block to render for **all authenticated roles** (admin/manager/employee/viewer) — matches "members can see it" and the existing `MyReportedIssuesWidget` all-roles precedent. The list itself stays global (not scoped to "my" borrows), same as today's Taken Items behavior.
- **Routing/nav**: update `client/src/app/router.tsx`, `client/src/components/layout/Sidebar.tsx`, and `client/src/constants/landing.ts` — every `/taken-items` reference becomes `/borrowed-items` (including the landing-page allowlist from sub-project D, so a user who set their landing page to Taken Items doesn't hit a dead route — fall back gracefully per the existing stale-landing-page handling).
- **i18n**: add `dashboard.borrowedItems.*` keys (request/accept/decline/cancel/requestedBy/currentHolder), replacing/extending the existing `dashboard.takenItems.*` namespace; same for the Consume action label wherever "Take" appeared in movement-modal copy.

---

## Permissions

| Action | viewer | employee | table manager | admin |
|---|---|---|---|---|
| Consume / Borrow stock | ✗ | ✓ | ✓ | ✓ |
| See borrowed-items list (dashboard/page) | ✓ | ✓ | ✓ | ✓ |
| Self-return (full or partial) own borrow | — | ✓ (if holder) | ✓ (if holder) | ✓ (if holder) |
| Request a borrow from its current holder | ✗ | ✓ | ✓ | ✓ |
| Accept / decline a request | — | ✓ (if current holder) | ✓ (any table they manage) | ✓ (any) |
| Cancel own pending request | — | ✓ (own only) | ✓ (own only) | ✓ (own only) |

A past holder further up the transfer chain (not the original state, and not the current one) has no standing rights on a record once they've handed it off — matches the "current holder only" decision. Their custody is visible only implicitly, via `previousBorrowRecordId`, if a history view is ever built (not in this scope).

---

## Testing

**Backend**
- `consumeStockItem` decrements correctly, rejects qty > available, writes `ConsumedStockItem`, never creates anything returnable.
- `borrowStockItem` creates an `active` `BorrowRecord`; two independent borrows against the same `StockBalance` by different users both succeed while combined qty ≤ available.
- `returnBorrowedItem`: partial return shrinks `quantity` and keeps `status: active`; full return closes it; non-holder gets 403; auto-cancels a pending request on full return.
- `requestBorrow`: 400 on requesting your own active borrow; 400 on a second pending request against the same record; succeeds otherwise.
- `acceptRequest`/`declineRequest`: 403 for a non-holder/non-manager/non-admin actor; 403 for a *past* holder further up the chain; concurrent double-accept — second caller's `updateMany` affects 0 rows and gets a clear "already resolved" response, not a duplicate transfer.
- `acceptRequest` creates the correct linked chain (`previousBorrowRecordId`) and closes the old record as `transferred`.
- Migration test: seed a mix of open/returned `TakenStockItem` rows, run the migration SQL, assert every row became a `BorrowRecord` with the right status/holder/closedAt and the old table is gone.

**Frontend**
- Movement modal offers Consume and Borrow (no Take).
- Widget shows Return only to the current holder, Request only to non-holders without a pending request, Accept/Decline only to holder/manager/admin, Cancel only to the requester.
- Widget/page render for all roles including viewer (read-only — no action buttons for viewer since `canTakeReturn` excludes them server-side, but the list itself is visible).

---

## Rollout / verification

Standard gate: `npm run lint && npm run build && npm run check:lines && docker compose up -d --build server client`. Before running the migration against real data, take a `pg_dump` backup per the project's backup rules. Manual pass: as an employee, consume an item (confirm no return option anywhere); borrow an item; as a second employee, request it; as the holder, accept — confirm the item now shows the second employee as holder and the chain is preserved; as a table manager, accept a request on a table they manage but aren't the holder of; confirm a declined request lets the requester file again; confirm a fully-returned borrow with a pending request auto-cancels it. Update `PLAN.md` at completion.

---

## Summary of DB changes

- **New:** `ConsumedStockItem`, `BorrowRecord`, `BorrowRequest`, enums `BorrowRecordStatus`/`BorrowRequestStatus`.
- **Removed:** `TakenStockItem` (data migrated into `BorrowRecord`, table dropped).
- **Unchanged:** `UsedInStockAssignment`, `StockBalance`, `StockMovement` (new `movementType` values `"consume"` and `"borrow"` alongside existing `"take_out"`/`"use_in"`/`"return"`).
