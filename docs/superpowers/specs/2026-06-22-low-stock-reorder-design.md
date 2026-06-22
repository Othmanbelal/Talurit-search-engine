# Low Stock — Thresholds, Reorder Links & Auto-Email — Design Spec
**Date:** 2026-06-22
**Status:** Draft (awaiting user review)
**Sub-project:** C of 4 (sequence: D → B → C → A)

---

## Overview

A per-item low-stock system for structured inventory. Each inventory table can turn low-stock tracking on; when on, managers/admins define a threshold (and an optional reorder link) per item, and the app automatically emails the table's managers the moment an item's quantity reaches the threshold.

Today only a **global** `inventory.lowStockThreshold` app-setting exists, used solely for the legacy `Tool` admin-dashboard count. That stays as-is and is unrelated to this feature, which operates on `StockBalance` (the real structured-inventory rows).

### Behaviour (user-specified)
- Each **inventory table** has a master low-stock toggle (manager/admin only). Off → no low-stock anywhere in that table.
- When the table is on, every row shows a **low-stock action button** (manager/admin only):
  - **Grey** when low stock is not defined for the item (neutral, like other row buttons).
  - **Yellow** when low stock is defined (enabled + threshold set).
  - Clicking opens an editor to set the **threshold** and an **optional order link**, and to **toggle low stock off** for that item.
- The **order link is optional**. An item becomes "defined" (yellow) with just an enabled toggle + a threshold.
- Threshold, order link, and on/off are also **visible & editable in the item details panel** (`StockRowDetailsDrawer`).
- A **"LOW" alert badge** appears on any enabled row whose quantity ≤ threshold, visible to **all** roles (read-only). Only the config button + editor are restricted to managers/admins.

---

## Data model

### `StockBalance` (table-specific row — matches "each item in each table")
```prisma
model StockBalance {
  // ...existing fields...
  lowStockEnabled    Boolean   @default(false)
  lowStockThreshold  Decimal?
  reorderUrl         String?
  lowStockNotifiedAt DateTime?   // set only on a successful reorder email; null = re-armed
}
```

**"Defined" (yellow button):** `lowStockEnabled == true && lowStockThreshold != null`.
**Toggling off:** sets `lowStockEnabled = false`; the threshold and reorder link are **retained** for easy re-enable.

### `InventoryTable` (master toggle)
```prisma
model InventoryTable {
  // ...existing fields...
  lowStockEnabled Boolean @default(false)
}
```
A real column (not `columnSettings` JSON) so the daily sweep can filter enabled tables efficiently.

### New `ReorderNotificationLog` (audit, per logging rules)
```prisma
model ReorderNotificationLog {
  id             String   @id @default(cuid())
  stockBalanceId String?
  itemName       String   // snapshot, survives row deletion
  tableName      String   // snapshot
  quantity       Decimal
  threshold      Decimal
  reorderUrl     String?
  recipients     String   // comma-joined emails actually targeted
  success        Boolean
  error          String?
  createdAt      DateTime @default(now())
  stockBalance   StockBalance? @relation(fields: [stockBalanceId], references: [id], onDelete: SetNull)

  @@index([stockBalanceId])
  @@index([createdAt])
  @@map("reorder_notification_logs")
}
```
(Add the back-relation `reorderLogs ReorderNotificationLog[]` to `StockBalance`.)

---

## Crossing detection & anti-spam

After **any** quantity change to a row, evaluate low stock:

```
effectiveEnabled = table.lowStockEnabled && row.lowStockEnabled && row.lowStockThreshold != null
if effectiveEnabled:
    if newQty <= threshold and lowStockNotifiedAt == null:
        send reorder email to table/group managers
        on success: set lowStockNotifiedAt = now()      // do NOT set on failure → retried by sweep
    if newQty > threshold:
        set lowStockNotifiedAt = null                   // re-arm for the next dip
```

- **One email per dip** (above → at/below). Restocking above the threshold re-arms.
- **Threshold comparison is "at or below"** (`<=`).
- **SMTP-down safe:** `lowStockNotifiedAt` is set only on a successful send. With the current Microsoft 365 SMTP block, the alert stays un-notified and the daily sweep retries until SMTP works — no lost alerts, and at most one attempt per row per sweep (no spam).

---

## Backend

### New module `server/src/modules/low-stock/`
- **`low-stock.service.ts`** — `evaluateLowStock(stockBalanceId)`: loads the row + table flags + manager emails, applies the crossing logic, sends via `low-stock.email.ts`, writes a `ReorderNotificationLog`, updates `lowStockNotifiedAt`. Fire-and-forget; never throws into the caller.
- **`low-stock.email.ts`** — builds the premium HTML/text (mirrors `urgent-issues.email.ts`): item name, article, table, location, quantity, threshold, and a **"Reorder now" CTA** linking to `reorderUrl` **only when set**; when absent, the email still sends with a "No order link configured" note.
- **`low-stock.repository.ts`** — DB access: load row with table + item + location; list all enabled-and-low rows for the sweep; write log.
- **`low-stock.scheduler.ts`** — `setInterval` + `.unref()` (mirrors `backup.scheduler.ts`); a daily reconciliation that calls `evaluateLowStock` for every enabled-and-low row not yet notified. Started from `server/src/index.ts` next to the backup scheduler.
- **`low-stock.controller.ts` / `low-stock.routes.ts` / `low-stock.schemas.ts`** — config endpoints (below).

### Config endpoints (manager/admin only)
- `PATCH /api/inventory/tables/:tableId/low-stock` — body `{ enabled: boolean }` → sets `InventoryTable.lowStockEnabled`.
- `PATCH /api/inventory/tables/:tableId/rows/:rowId/low-stock` — body `{ enabled: boolean, threshold?: number|null, reorderUrl?: string|null }` → sets the row fields. Validates: `reorderUrl` (when provided) is a valid `http(s)` URL; `threshold` ≥ 0; enabling requires a threshold (order link optional).
- Authorization: the user must be **admin** or a **manager of the table/group**. Enforced server-side via the shared manager helper; never trust client role/ids.

### Hook points for `evaluateLowStock`
Call after each quantity change, passing the affected `stockBalanceId`:
- `stock-movement.service.ts` → after `takeStockItem`, `useStockItemInCard` (decrements) and `returnTakenItem`, `returnUsedInAssignment` (increments → may re-arm).
- `stock-row-editor.ts` / `manual-stock-writer.ts` → after a manual quantity edit.
Calls are post-commit and non-blocking (`.catch` logged), matching the existing `logInteraction` pattern.

### Shared manager helper (targeted de-dup)
Extract the duplicated `resolveManagerTableIds` (in `urgent-issues.service.ts`) and `getManagerEmails` (in `urgent-issues.email.ts`) into `server/src/modules/managers/manager-access.ts`, consumed by both urgent-issues and low-stock. Provides `isTableManager(userId, tableId)` (authorization) and `getManagerEmails(tableId)` (recipients).

---

## Frontend

### Inventory table view (`components/structured-inventory/…`)
- **Table master toggle** in the table header/settings (manager/admin) → `PATCH …/low-stock`.
- **Row config button** (manager/admin, only when table toggle on): yellow when defined, grey otherwise. Opens **`LowStockConfigPopover`** with threshold input, optional order-link input, and an enable/disable toggle.
- **"LOW" badge** on enabled rows where `quantity <= threshold`, shown to all roles.

### Item details panel (`StockRowDetailsDrawer`)
- New **`LowStockSection`** (extracted to its own file): shows threshold, order link (as a clickable link), and enabled state; editable by managers/admins via the same row endpoint.

### Services / types
- `structured-inventory.service.ts` (or a small `low-stock.service.ts` client) gains the two PATCH calls.
- `StructuredStockRow` type gains `lowStockEnabled`, `lowStockThreshold`, `reorderUrl`, and a derived `isLow` flag from the serializer; table type gains `lowStockEnabled`.

### File-size compliance
New popover/section/email/service files keep everything under 350 lines; `StockRowDetailsDrawer` is split by extracting `LowStockSection`. Run `npm run check:lines`.

---

## Permissions

| Action | admin | table/group manager | employee | viewer |
|--------|-------|---------------------|----------|--------|
| Toggle table low-stock | ✓ | ✓ | ✗ | ✗ |
| Define/edit item threshold + link + toggle | ✓ | ✓ | ✗ | ✗ |
| See "LOW" badge | ✓ | ✓ | ✓ | ✓ |
| Receive reorder email | ✓ (if manager) | ✓ | ✗ | ✗ |

---

## Testing

**Backend**
- Crossing: email fires once when qty drops to ≤ threshold; not again while still low; re-arms after restock above threshold, then fires again on the next dip.
- SMTP-down: `lowStockNotifiedAt` stays null on failure; `ReorderNotificationLog` records `success=false`; the sweep retries.
- Gating: no email when the table toggle is off, when the item is disabled, or when no threshold is set.
- Authorization: non-manager/non-admin gets 403 on both config endpoints; URL/threshold validation rejects bad input.
- Sweep: picks up rows newly low due to a lowered threshold or manual edit.

**Frontend**
- Button is yellow only when defined, grey otherwise; hidden when the table toggle is off.
- "LOW" badge renders for an enabled low row for every role.
- Details-panel section edits persist and reflect in the table.

---

## Rollout / verification

Standard gate: `npm run lint && npm run build && npm run check:lines && docker compose up -d --build server client`. Manual pass: enable a table's low stock, define an item threshold + link, take stock below the threshold, confirm one manager email with the reorder CTA, confirm no repeat email, restock above and dip again to confirm a second email. Update `PLAN.md` at completion.

> **Dependency note:** automatic emails require working SMTP. Per AGENTS.md, Microsoft 365 SMTP AUTH is currently blocked by IT; until resolved, crossings are detected and logged and the daily sweep retries sending — no alerts are lost, they are just deferred until SMTP works.

---

## Summary of DB changes (as requested)

- **`StockBalance`**: `+lowStockEnabled Boolean @default(false)`, `+lowStockThreshold Decimal?`, `+reorderUrl String?`, `+lowStockNotifiedAt DateTime?`
- **`InventoryTable`**: `+lowStockEnabled Boolean @default(false)`
- **New model `ReorderNotificationLog`** (+ back-relation on `StockBalance`)
All additive; no backfill. The legacy global `inventory.lowStockThreshold` app-setting is untouched.
