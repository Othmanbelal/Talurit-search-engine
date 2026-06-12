# Notes & Urgent Issues — Design Spec
**Date:** 2026-05-29  
**Status:** Approved

---

## Overview

Two new systems added across the tool inventory platform:

1. **Item Notes** — A per-item, per-table threaded note feed visible to all authenticated users, writable by employees/managers/admins, with role-scoped delete.
2. **Urgent Issues** — An employee-triggered escalation system that notifies table managers via a dashboard panel, with open/resolve/unresolve lifecycle and automatic 7-day cleanup of resolved issues.

Both systems surface on dedicated dashboard widgets visible to all roles (with appropriate scoping).

---

## System 1 — Item Notes

### Where it lives

Inside the existing `StockRowDetailsDrawer`, which is split into two columns:
- **Left column:** item fields (article, qty, location, attributes, etc.) + actions (Edit, Archive, Report Urgent Issue button at bottom)
- **Right column:** Notes panel (full height, scrollable)

### Data model

New Prisma model `ItemNote`:

```
model ItemNote {
  id             String       @id @default(cuid())
  stockBalanceId String
  stockBalance   StockBalance @relation(fields: [stockBalanceId], references: [id], onDelete: Cascade)
  authorId       String
  author         User         @relation(fields: [authorId], references: [id])
  content        String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}
```

Notes are scoped to `StockBalance` (the table-specific inventory row), not `InventoryItem`, so the same physical item in two different tables has independent note threads.

### Permissions

| Action | admin | manager | employee | viewer |
|--------|-------|---------|----------|--------|
| Read notes | ✓ | ✓ | ✓ | ✓ |
| Write note | ✓ | ✓ | ✓ | ✗ |
| Delete own note | ✓ | ✓ | ✓ | ✗ |
| Delete any note | ✓ | ✓ | ✗ | ✗ |

### UI — Notes panel (right column of drawer)

- Notes displayed in chronological order (oldest at top, newest at bottom)
- Each note card shows:
  - Author avatar (initials fallback) + name + role badge (subtle)
  - Timestamp (relative: "2h ago", absolute on hover)
  - Note text
  - Trash icon on hover — visible only if the user can delete that note
- Input area pinned at the bottom of the panel:
  - Textarea with placeholder "Write a note…"
  - Submit button + Ctrl+Enter keyboard shortcut
  - Disabled for viewers (panel shows "View only" label instead)
- Empty state: "No notes yet. Be the first to add one."

### API

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/structured-inventory/tables/:tableId/rows/:rowId/notes` | requireAuth | List notes for a stock row |
| POST | `/api/structured-inventory/tables/:tableId/rows/:rowId/notes` | employee+ | Create a note |
| DELETE | `/api/structured-inventory/tables/:tableId/rows/:rowId/notes/:noteId` | employee+ | Delete a note (service enforces own-note rule for employees) |

---

## System 2 — Urgent Issues

### Trigger

A **"Report Urgent Issue"** button sits at the bottom of the left (details) panel inside the item drawer.

- Styled: red border, red text, warning icon
- Visible to: `employee`, `manager`, `admin`
- Hidden for: `viewer`

### Report form (modal overlay)

Opens a centred modal with:
- Header: "🚨 Report Urgent Issue"
- Subtitle: item name · table name
- `<textarea>` — "Describe the issue" (required, min 10 chars)
- "Cancel" button (closes modal)
- "Send to Manager" button (red, submits)

On submit: creates an `UrgentIssue` record, modal closes, brief success toast shown.

### Who is notified

All `ResourceManager` records for that `InventoryTable` (direct) plus all `ResourceManager` records for the parent `InventoryGroup` (inherited). Admins always see all issues regardless of table assignment.

Notification is **in-app only** (dashboard panel). No email for now — can be added later.

### Data model

New Prisma model `UrgentIssue`:

```
model UrgentIssue {
  id              String    @id @default(cuid())
  tableId         String
  table           InventoryTable @relation(fields: [tableId], references: [id], onDelete: Cascade)
  stockBalanceId  String
  stockBalance    StockBalance   @relation(fields: [stockBalanceId], references: [id], onDelete: Cascade)
  senderId        String
  sender          User      @relation("UrgentIssueSender", fields: [senderId], references: [id])
  message         String
  // Snapshot of item details at time of report (item may change later)
  itemSnapshot    Json
  status          UrgentIssueStatus @default(open)
  resolvedAt      DateTime?
  resolvedById    String?
  resolvedBy      User?     @relation("UrgentIssueResolver", fields: [resolvedById], references: [id])
  createdAt       DateTime  @default(now())
}

enum UrgentIssueStatus {
  open
  resolved
}
```

`itemSnapshot` stores: `{ itemName, articleNumber, tableName, location, quantity }` at the moment of reporting, so the dashboard card remains accurate even if the item changes.

### Lifecycle

```
[open] --resolve--> [resolved] --unresolve (within 7d)--> [open]
[resolved] --7 days pass--> deleted from DB
```

- **Resolve:** Manager/admin clicks "Resolve" → sets `status = resolved`, stamps `resolvedAt` and `resolvedBy`
- **Unresolve:** Manager/admin clicks "Unresolve" on a resolved card (available for 7 days) → sets `status = open`, clears `resolvedAt`/`resolvedBy`
- **Auto-delete:** A scheduled job (or on-read filter) removes resolved issues where `resolvedAt < now() - 7 days`. Implemented as a startup cron or a cleanup function called before each dashboard fetch.

### Permissions

| Action | admin | manager (assigned) | employee | viewer |
|--------|-------|--------------------|----------|--------|
| Create issue | ✓ | ✓ | ✓ | ✗ |
| View open issues | ✓ | ✓ (own tables) | ✗ | ✗ |
| View resolved issues | ✓ | ✓ (own tables) | ✗ | ✗ |
| Resolve / Unresolve | ✓ | ✓ (own tables) | ✗ | ✗ |

Employees who submitted an issue see a "Your reported issues" feed on their own dashboard (see Section 3).

### API

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/urgent-issues` | employee+ | Create issue |
| GET | `/api/urgent-issues` | manager+ | List issues for managed tables (query: `status=open|resolved`) |
| PATCH | `/api/urgent-issues/:id/resolve` | manager+ | Resolve an issue |
| PATCH | `/api/urgent-issues/:id/unresolve` | manager+ | Unresolve an issue |

---

## System 3 — Dashboard Widgets

### Urgent Issues panel (manager + admin dashboard)

Two-column layout:

**Left — Open Issues** (red left-border cards):
- Sender avatar + name + time ago
- Item name (gold) · table name
- Message text
- Green "✓ Resolve" button

**Right — Resolved** (muted cards):
- Same info, greyed out
- "↩ Unresolve" button
- Footer: "Resolved issues kept for 7 days"

Empty state per column: "No open issues" / "No resolved issues this week"

### Employee "My Reported Issues" section (employee dashboard)

Employees see only issues they submitted:
- Same card style but no Resolve button
- Status badge: "Open" (red) or "Resolved ✓" (green)
- Lets employees track whether their reports were actioned

### Recent Notes feed (all roles, dashboard)

- Notes grouped by **table name**, each group has a coloured accent header
- Within each group: notes sorted newest-first
- Each note: author avatar + name, item name (link to open drawer), note text, timestamp
- **Dropdown filter** top-right: "All tables" or pick a specific table
- Scoping: employees and viewers see only tables they can access; managers see their assigned tables; admins see all

**API:**
```
GET /api/notes/recent?limit=30&tableId=<optional>
```
Returns notes across all accessible stock rows, grouped by table on the frontend.

---

## File Structure

### Server (new files)

```
server/src/modules/item-notes/
  item-notes.routes.ts
  item-notes.controller.ts
  item-notes.service.ts
  item-notes.repository.ts
  item-notes.schemas.ts

server/src/modules/urgent-issues/
  urgent-issues.routes.ts
  urgent-issues.controller.ts
  urgent-issues.service.ts
  urgent-issues.repository.ts
  urgent-issues.schemas.ts
  urgent-issues.cleanup.ts    ← resolvedAt expiry logic
  urgent-issues.serializer.ts
```

### Client (new/modified files)

```
client/src/components/structured-inventory/
  ItemNotesPanel.tsx          ← right column of drawer
  UrgentIssueButton.tsx       ← button + modal
  UrgentIssueModal.tsx        ← modal form

client/src/components/dashboard/
  UrgentIssuesWidget.tsx      ← two-column open/resolved
  RecentNotesWidget.tsx       ← grouped by table
  MyReportedIssuesWidget.tsx  ← employee view

client/src/services/
  itemNotesService.ts
  urgentIssuesService.ts

client/src/hooks/
  useItemNotes.ts
  useUrgentIssues.ts

client/src/types/
  notes.ts
  urgent-issues.ts
```

### DB migration

```
prisma/migrations/20260529_notes_and_urgent_issues/migration.sql
```

---

## Constraints & Rules

- No file may exceed 350 lines (per CLAUDE.md)
- `UrgentIssueModal` and `ItemNotesPanel` are separate components — do not inline them in the drawer
- Cleanup of resolved issues runs inside `urgent-issues.service.ts` before every `listUrgentIssues` call (no separate cron needed for now — avoids infra complexity)
- `itemSnapshot` is write-once — never updated after creation
- The drawer split layout is not changed by this spec — only the right column content is extended and the button added to the left column
- All new API routes validate input with Zod schemas
- Delete note endpoint checks ownership in the service layer, not just via role middleware
