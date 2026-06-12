# Notes & Urgent Issues — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a threaded item-notes system and an urgent-issues escalation system to the tool inventory platform, with dashboard widgets for both.

**Architecture:** Two new server modules (`item-notes`, `urgent-issues`) with their own routes/controllers/services/repositories. Frontend adds an `ItemNotesPanel` to the existing `StockRowDetailsDrawer` (split layout), an `UrgentIssueModal`, and three new dashboard widgets. One Prisma migration adds `ItemNote` and `UrgentIssue` models.

**Tech Stack:** Node.js/Express/Prisma/PostgreSQL (server), React/TypeScript/Tailwind (client), Docker Compose (deployment).

---

## File Map

### New server files
```
server/src/modules/item-notes/item-notes.schemas.ts
server/src/modules/item-notes/item-notes.repository.ts
server/src/modules/item-notes/item-notes.service.ts
server/src/modules/item-notes/item-notes.controller.ts
server/src/modules/item-notes/item-notes.routes.ts

server/src/modules/urgent-issues/urgent-issues.schemas.ts
server/src/modules/urgent-issues/urgent-issues.repository.ts
server/src/modules/urgent-issues/urgent-issues.serializer.ts
server/src/modules/urgent-issues/urgent-issues.service.ts
server/src/modules/urgent-issues/urgent-issues.controller.ts
server/src/modules/urgent-issues/urgent-issues.routes.ts
```

### Modified server files
```
prisma/schema.prisma                        ← add ItemNote, UrgentIssue models + back-relations
server/src/app.ts                           ← register 2 new route modules
```

### New client files
```
client/src/types/notes.ts
client/src/types/urgent-issues.ts
client/src/services/itemNotesService.ts
client/src/services/urgentIssuesService.ts
client/src/hooks/useItemNotes.ts
client/src/hooks/useUrgentIssues.ts
client/src/components/structured-inventory/ItemNotesPanel.tsx
client/src/components/structured-inventory/UrgentIssueModal.tsx
client/src/components/dashboard/UrgentIssuesWidget.tsx
client/src/components/dashboard/RecentNotesWidget.tsx
client/src/components/dashboard/MyReportedIssuesWidget.tsx
```

### Modified client files
```
client/src/components/structured-inventory/StockRowDetailsDrawer.tsx  ← split layout + notes + urgent button
client/src/pages/DashboardPage.tsx                                     ← add three new widgets
```

---

## Task 1: Prisma schema — add ItemNote and UrgentIssue models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the UrgentIssueStatus enum after the existing enums near the top of the file (after line 30, before `model User`)**

In `prisma/schema.prisma`, find the block ending with:
```
enum ToolStatus {
  AVAILABLE
  LOW_STOCK
  MISSING
  DAMAGED
  MAINTENANCE
  ARCHIVED
}
```
Add immediately after it:
```prisma
enum UrgentIssueStatus {
  open
  resolved
}
```

- [ ] **Step 2: Add back-relations to the User model**

In `prisma/schema.prisma`, find the `User` model. After the line:
```
  assignedManagers         ResourceManager[]         @relation("UserAssignedManagers")
```
Add:
```prisma
  itemNotes                ItemNote[]                @relation("ItemNoteAuthor")
  sentUrgentIssues         UrgentIssue[]             @relation("UrgentIssueSender")
  resolvedUrgentIssues     UrgentIssue[]             @relation("UrgentIssueResolver")
```

- [ ] **Step 3: Add back-relations to the StockBalance model**

In `prisma/schema.prisma`, find the `StockBalance` model. After the line:
```
  interactionLogs          ItemInteractionLog[]
```
Add:
```prisma
  itemNotes                ItemNote[]
  urgentIssues             UrgentIssue[]
```

- [ ] **Step 4: Add back-relation to the InventoryTable model**

In `prisma/schema.prisma`, find the `InventoryTable` model. After the line:
```
  stockBalances            StockBalance[]
```
Add:
```prisma
  urgentIssues             UrgentIssue[]
```

- [ ] **Step 5: Add the two new models at the end of the schema file**

Append to the end of `prisma/schema.prisma`:
```prisma
model ItemNote {
  id             String       @id @default(cuid())
  stockBalanceId String
  authorId       String
  content        String
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  stockBalance   StockBalance @relation(fields: [stockBalanceId], references: [id], onDelete: Cascade)
  author         User         @relation("ItemNoteAuthor", fields: [authorId], references: [id], onDelete: Cascade)

  @@index([stockBalanceId])
  @@index([authorId])
  @@map("item_notes")
}

model UrgentIssue {
  id             String            @id @default(cuid())
  tableId        String
  stockBalanceId String
  senderId       String
  resolvedById   String?
  message        String
  itemSnapshot   Json
  status         UrgentIssueStatus @default(open)
  resolvedAt     DateTime?
  createdAt      DateTime          @default(now())
  table          InventoryTable    @relation(fields: [tableId], references: [id], onDelete: Cascade)
  stockBalance   StockBalance      @relation(fields: [stockBalanceId], references: [id], onDelete: Cascade)
  sender         User              @relation("UrgentIssueSender", fields: [senderId], references: [id], onDelete: Cascade)
  resolvedBy     User?             @relation("UrgentIssueResolver", fields: [resolvedById], references: [id], onDelete: SetNull)

  @@index([tableId])
  @@index([stockBalanceId])
  @@index([senderId])
  @@index([status])
  @@map("urgent_issues")
}
```

- [ ] **Step 6: Run the migration inside Docker**

```powershell
docker exec tool_inventory_server sh -c "cd /app && npx prisma migrate dev --name notes_and_urgent_issues --schema ../prisma/schema.prisma"
```

Expected output: `Your database is now in sync with your schema.`

If the dev server is running in production mode (no `migrate dev`), use:
```powershell
docker exec tool_inventory_server sh -c "npm --workspace server run db:migrate:deploy"
```

- [ ] **Step 7: Verify Prisma client regenerated**

```powershell
docker exec tool_inventory_server sh -c "node -e ""const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); console.log('OK:', typeof p.itemNote, typeof p.urgentIssue)"""
```

Expected output: `OK: object object`

---

## Task 2: Item Notes — server module

**Files:**
- Create: `server/src/modules/item-notes/item-notes.schemas.ts`
- Create: `server/src/modules/item-notes/item-notes.repository.ts`
- Create: `server/src/modules/item-notes/item-notes.service.ts`
- Create: `server/src/modules/item-notes/item-notes.controller.ts`
- Create: `server/src/modules/item-notes/item-notes.routes.ts`

- [ ] **Step 1: Create schemas**

Create `server/src/modules/item-notes/item-notes.schemas.ts`:
```typescript
import { z } from "zod";

export const CreateItemNoteSchema = z.object({
  stockBalanceId: z.string().min(1),
  content: z.string().min(1).max(2000),
});

export type CreateItemNoteInput = z.infer<typeof CreateItemNoteSchema>;
```

- [ ] **Step 2: Create repository**

Create `server/src/modules/item-notes/item-notes.repository.ts`:
```typescript
import { prisma } from "../../db/prisma";

const AUTHOR_SELECT = {
  id: true,
  name: true,
  role: true,
  profile: { select: { profilePictureUrl: true } },
} as const;

export async function findNotesByStockBalance(stockBalanceId: string) {
  return prisma.itemNote.findMany({
    where: { stockBalanceId },
    include: { author: { select: AUTHOR_SELECT } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createNote(stockBalanceId: string, authorId: string, content: string) {
  return prisma.itemNote.create({
    data: { stockBalanceId, authorId, content },
    include: { author: { select: AUTHOR_SELECT } },
  });
}

export async function findNoteById(id: string) {
  return prisma.itemNote.findUnique({ where: { id } });
}

export async function deleteNoteById(id: string) {
  return prisma.itemNote.delete({ where: { id } });
}

export async function findRecentNotes(tableId: string | undefined, limit: number) {
  return prisma.itemNote.findMany({
    where: tableId ? { stockBalance: { inventoryTableId: tableId } } : undefined,
    include: {
      author: { select: AUTHOR_SELECT },
      stockBalance: {
        select: {
          id: true,
          inventoryTableId: true,
          inventoryTable: { select: { id: true, name: true } },
          item: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
```

- [ ] **Step 3: Create service**

Create `server/src/modules/item-notes/item-notes.service.ts`:
```typescript
import { AppError } from "../../utils/AppError";
import {
  createNote,
  deleteNoteById,
  findNoteById,
  findNotesByStockBalance,
  findRecentNotes,
} from "./item-notes.repository";

export async function listNotesForRow(stockBalanceId: string) {
  return findNotesByStockBalance(stockBalanceId);
}

export async function addNote(stockBalanceId: string, authorId: string, content: string) {
  return createNote(stockBalanceId, authorId, content);
}

export async function removeNote(noteId: string, userId: string, userRole: string) {
  const note = await findNoteById(noteId);
  if (!note) throw new AppError(404, "Note not found");
  const canDelete =
    userRole === "admin" || userRole === "manager" || note.authorId === userId;
  if (!canDelete) throw new AppError(403, "Cannot delete another user's note");
  await deleteNoteById(noteId);
}

export async function listRecentNotes(tableId: string | undefined, limit: number) {
  return findRecentNotes(tableId, Math.min(limit, 100));
}
```

- [ ] **Step 4: Create controller**

Create `server/src/modules/item-notes/item-notes.controller.ts`:
```typescript
import type { Request, Response } from "express";
import { CreateItemNoteSchema } from "./item-notes.schemas";
import { addNote, listNotesForRow, listRecentNotes, removeNote } from "./item-notes.service";

export async function listNotesController(req: Request, res: Response) {
  const { stockBalanceId } = req.query;
  if (typeof stockBalanceId !== "string" || !stockBalanceId) {
    res.status(400).json({ success: false, message: "stockBalanceId required" });
    return;
  }
  const notes = await listNotesForRow(stockBalanceId);
  res.json({ success: true, data: notes });
}

export async function createNoteController(req: Request, res: Response) {
  const input = CreateItemNoteSchema.parse(req.body);
  const note = await addNote(input.stockBalanceId, req.user!.id, input.content);
  res.status(201).json({ success: true, data: note });
}

export async function deleteNoteController(req: Request, res: Response) {
  await removeNote(req.params.noteId, req.user!.id, req.user!.role);
  res.status(204).send();
}

export async function recentNotesController(req: Request, res: Response) {
  const tableId = typeof req.query.tableId === "string" ? req.query.tableId : undefined;
  const limit = Number(req.query.limit) || 30;
  const notes = await listRecentNotes(tableId, limit);
  res.json({ success: true, data: notes });
}
```

- [ ] **Step 5: Create routes**

Create `server/src/modules/item-notes/item-notes.routes.ts`:
```typescript
import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createNoteController,
  deleteNoteController,
  listNotesController,
  recentNotesController,
} from "./item-notes.controller";

export const itemNotesRoutes = Router();
itemNotesRoutes.use(requireAuth);

const canWrite = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

itemNotesRoutes.get("/", asyncHandler(listNotesController));
itemNotesRoutes.get("/recent", asyncHandler(recentNotesController));
itemNotesRoutes.post("/", canWrite, asyncHandler(createNoteController));
itemNotesRoutes.delete("/:noteId", canWrite, asyncHandler(deleteNoteController));
```

---

## Task 3: Urgent Issues — server module

**Files:**
- Create: `server/src/modules/urgent-issues/urgent-issues.schemas.ts`
- Create: `server/src/modules/urgent-issues/urgent-issues.repository.ts`
- Create: `server/src/modules/urgent-issues/urgent-issues.serializer.ts`
- Create: `server/src/modules/urgent-issues/urgent-issues.service.ts`
- Create: `server/src/modules/urgent-issues/urgent-issues.controller.ts`
- Create: `server/src/modules/urgent-issues/urgent-issues.routes.ts`

- [ ] **Step 1: Create schemas**

Create `server/src/modules/urgent-issues/urgent-issues.schemas.ts`:
```typescript
import { z } from "zod";

export const CreateUrgentIssueSchema = z.object({
  tableId: z.string().min(1),
  stockBalanceId: z.string().min(1),
  message: z.string().min(10).max(2000),
});

export type CreateUrgentIssueInput = z.infer<typeof CreateUrgentIssueSchema>;
```

- [ ] **Step 2: Create repository**

Create `server/src/modules/urgent-issues/urgent-issues.repository.ts`:
```typescript
import { prisma } from "../../db/prisma";
import type { UrgentIssueStatus } from "@prisma/client";

const INCLUDE_FULL = {
  sender: {
    select: {
      id: true,
      name: true,
      role: true,
      profile: { select: { profilePictureUrl: true } },
    },
  },
  resolvedBy: { select: { id: true, name: true } },
  table: { select: { id: true, name: true } },
} as const;

type CreateIssueData = {
  tableId: string;
  stockBalanceId: string;
  senderId: string;
  message: string;
  itemSnapshot: object;
};

export async function createUrgentIssue(data: CreateIssueData) {
  return prisma.urgentIssue.create({
    data: { ...data, itemSnapshot: data.itemSnapshot as Parameters<typeof prisma.urgentIssue.create>[0]["data"]["itemSnapshot"] },
    include: INCLUDE_FULL,
  });
}

export async function findIssuesForTables(tableIds: string[], status: UrgentIssueStatus) {
  return prisma.urgentIssue.findMany({
    where: { tableId: { in: tableIds }, status },
    include: INCLUDE_FULL,
    orderBy: { createdAt: "desc" },
  });
}

export async function findAllIssues(status: UrgentIssueStatus) {
  return prisma.urgentIssue.findMany({
    where: { status },
    include: INCLUDE_FULL,
    orderBy: { createdAt: "desc" },
  });
}

export async function findIssuesBySender(senderId: string) {
  return prisma.urgentIssue.findMany({
    where: { senderId },
    include: INCLUDE_FULL,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function findIssueById(id: string) {
  return prisma.urgentIssue.findUnique({ where: { id }, include: INCLUDE_FULL });
}

export async function resolveIssue(id: string, resolvedById: string) {
  return prisma.urgentIssue.update({
    where: { id },
    data: { status: "resolved", resolvedAt: new Date(), resolvedById },
    include: INCLUDE_FULL,
  });
}

export async function unresolveIssue(id: string) {
  return prisma.urgentIssue.update({
    where: { id },
    data: { status: "open", resolvedAt: null, resolvedById: null },
    include: INCLUDE_FULL,
  });
}

export async function deleteExpiredResolvedIssues() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.urgentIssue.deleteMany({
    where: { status: "resolved", resolvedAt: { lt: cutoff } },
  });
}
```

- [ ] **Step 3: Create serializer**

Create `server/src/modules/urgent-issues/urgent-issues.serializer.ts`:
```typescript
type IssueRow = {
  id: string;
  tableId: string;
  stockBalanceId: string;
  senderId: string;
  resolvedById: string | null;
  message: string;
  itemSnapshot: unknown;
  status: string;
  resolvedAt: Date | null;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    role: string;
    profile: { profilePictureUrl: string | null } | null;
  };
  resolvedBy: { id: string; name: string } | null;
  table: { id: string; name: string };
};

export function serializeIssue(issue: IssueRow) {
  return {
    id: issue.id,
    tableId: issue.tableId,
    tableName: issue.table.name,
    stockBalanceId: issue.stockBalanceId,
    message: issue.message,
    itemSnapshot: issue.itemSnapshot as Record<string, unknown>,
    status: issue.status as "open" | "resolved",
    resolvedAt: issue.resolvedAt?.toISOString() ?? null,
    createdAt: issue.createdAt.toISOString(),
    sender: {
      id: issue.sender.id,
      name: issue.sender.name,
      role: issue.sender.role,
      pictureUrl: issue.sender.profile?.profilePictureUrl ?? null,
    },
    resolvedBy: issue.resolvedBy
      ? { id: issue.resolvedBy.id, name: issue.resolvedBy.name }
      : null,
  };
}
```

- [ ] **Step 4: Create service**

Create `server/src/modules/urgent-issues/urgent-issues.service.ts`:
```typescript
import { AppError } from "../../utils/AppError";
import { prisma } from "../../db/prisma";
import {
  createUrgentIssue,
  deleteExpiredResolvedIssues,
  findAllIssues,
  findIssueById,
  findIssuesBySender,
  findIssuesForTables,
  resolveIssue,
  unresolveIssue,
} from "./urgent-issues.repository";
import { serializeIssue } from "./urgent-issues.serializer";
import type { UrgentIssueStatus } from "@prisma/client";

async function buildItemSnapshot(stockBalanceId: string) {
  const row = await prisma.stockBalance.findUnique({
    where: { id: stockBalanceId },
    include: {
      item: { select: { name: true, articleNumber: true } },
      location: { select: { code: true } },
      inventoryTable: { select: { name: true } },
    },
  });
  if (!row) throw new AppError(404, "Stock row not found");
  return {
    itemName: row.item.name,
    articleNumber: row.item.articleNumber ?? null,
    tableName: row.inventoryTable?.name ?? "Unknown table",
    location: row.location?.code ?? null,
    quantity: Number(row.quantity),
    unit: row.unit,
  };
}

async function resolveManagerTableIds(userId: string): Promise<string[]> {
  const managers = await prisma.resourceManager.findMany({
    where: { userId },
    select: { resourceType: true, resourceId: true },
  });
  const directTableIds = managers
    .filter((m) => m.resourceType === "inventory_table")
    .map((m) => m.resourceId);
  const groupIds = managers
    .filter((m) => m.resourceType === "inventory_group")
    .map((m) => m.resourceId);
  let inheritedTableIds: string[] = [];
  if (groupIds.length > 0) {
    const tables = await prisma.inventoryTable.findMany({
      where: { groupId: { in: groupIds } },
      select: { id: true },
    });
    inheritedTableIds = tables.map((t) => t.id);
  }
  return [...new Set([...directTableIds, ...inheritedTableIds])];
}

export async function reportUrgentIssue(
  tableId: string,
  stockBalanceId: string,
  senderId: string,
  message: string
) {
  const itemSnapshot = await buildItemSnapshot(stockBalanceId);
  const issue = await createUrgentIssue({ tableId, stockBalanceId, senderId, message, itemSnapshot });
  return serializeIssue(issue);
}

export async function listUrgentIssues(
  userId: string,
  userRole: string,
  status: UrgentIssueStatus
) {
  await deleteExpiredResolvedIssues();
  if (userRole === "admin") {
    return (await findAllIssues(status)).map(serializeIssue);
  }
  const tableIds = await resolveManagerTableIds(userId);
  return (await findIssuesForTables(tableIds, status)).map(serializeIssue);
}

export async function listMyReportedIssues(senderId: string) {
  return (await findIssuesBySender(senderId)).map(serializeIssue);
}

export async function markResolved(issueId: string, userId: string, userRole: string) {
  const issue = await findIssueById(issueId);
  if (!issue) throw new AppError(404, "Issue not found");
  if (userRole !== "admin" && userRole !== "manager") {
    throw new AppError(403, "Only managers and admins can resolve issues");
  }
  return serializeIssue(await resolveIssue(issueId, userId));
}

export async function markUnresolved(issueId: string, userId: string, userRole: string) {
  const issue = await findIssueById(issueId);
  if (!issue) throw new AppError(404, "Issue not found");
  if (userRole !== "admin" && userRole !== "manager") {
    throw new AppError(403, "Only managers and admins can unresolve issues");
  }
  if (issue.status !== "resolved") throw new AppError(400, "Issue is not resolved");
  return serializeIssue(await unresolveIssue(issueId));
}
```

- [ ] **Step 5: Create controller**

Create `server/src/modules/urgent-issues/urgent-issues.controller.ts`:
```typescript
import type { Request, Response } from "express";
import type { UrgentIssueStatus } from "@prisma/client";
import { CreateUrgentIssueSchema } from "./urgent-issues.schemas";
import {
  listMyReportedIssues,
  listUrgentIssues,
  markResolved,
  markUnresolved,
  reportUrgentIssue,
} from "./urgent-issues.service";

export async function createUrgentIssueController(req: Request, res: Response) {
  const input = CreateUrgentIssueSchema.parse(req.body);
  const issue = await reportUrgentIssue(
    input.tableId,
    input.stockBalanceId,
    req.user!.id,
    input.message
  );
  res.status(201).json({ success: true, data: issue });
}

export async function listUrgentIssuesController(req: Request, res: Response) {
  const status = (req.query.status === "resolved" ? "resolved" : "open") as UrgentIssueStatus;
  const issues = await listUrgentIssues(req.user!.id, req.user!.role, status);
  res.json({ success: true, data: issues });
}

export async function listMyIssuesController(req: Request, res: Response) {
  const issues = await listMyReportedIssues(req.user!.id);
  res.json({ success: true, data: issues });
}

export async function resolveUrgentIssueController(req: Request, res: Response) {
  const issue = await markResolved(req.params.id, req.user!.id, req.user!.role);
  res.json({ success: true, data: issue });
}

export async function unresolveUrgentIssueController(req: Request, res: Response) {
  const issue = await markUnresolved(req.params.id, req.user!.id, req.user!.role);
  res.json({ success: true, data: issue });
}
```

- [ ] **Step 6: Create routes**

Create `server/src/modules/urgent-issues/urgent-issues.routes.ts`:
```typescript
import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createUrgentIssueController,
  listMyIssuesController,
  listUrgentIssuesController,
  resolveUrgentIssueController,
  unresolveUrgentIssueController,
} from "./urgent-issues.controller";

export const urgentIssueRoutes = Router();
urgentIssueRoutes.use(requireAuth);

const canReport = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);
const canManage = requireRoles(UserRole.admin, UserRole.manager);

urgentIssueRoutes.post("/", canReport, asyncHandler(createUrgentIssueController));
urgentIssueRoutes.get("/my", canReport, asyncHandler(listMyIssuesController));
urgentIssueRoutes.get("/", canManage, asyncHandler(listUrgentIssuesController));
urgentIssueRoutes.patch("/:id/resolve", canManage, asyncHandler(resolveUrgentIssueController));
urgentIssueRoutes.patch("/:id/unresolve", canManage, asyncHandler(unresolveUrgentIssueController));
```

---

## Task 4: Register new routes in app.ts

**Files:**
- Modify: `server/src/app.ts`

- [ ] **Step 1: Add imports**

In `server/src/app.ts`, after the line:
```typescript
import { resourceManagerRoutes } from "./modules/resource-managers/resource-managers.routes";
```
Add:
```typescript
import { itemNotesRoutes } from "./modules/item-notes/item-notes.routes";
import { urgentIssueRoutes } from "./modules/urgent-issues/urgent-issues.routes";
```

- [ ] **Step 2: Register routes**

In `server/src/app.ts`, after the line:
```typescript
  app.use(`${API_PREFIX}/warehouses`, warehouseRoutes);
```
Add:
```typescript
  app.use(`${API_PREFIX}/item-notes`, itemNotesRoutes);
  app.use(`${API_PREFIX}/urgent-issues`, urgentIssueRoutes);
```

- [ ] **Step 3: Rebuild and restart server container**

```powershell
cd "c:\Users\othman.belal\Desktop\Web applications\Search Engine\tool-inventory-system"
docker compose build server; if ($?) { docker compose up -d server }
```

Expected: `Server listening on port 4000`

- [ ] **Step 4: Smoke-test routes exist**

```powershell
curl -s http://localhost:4000/api/item-notes -o $null -w "%{http_code}"
```

Expected: `401` (routes exist, auth required — not 404)

```powershell
curl -s http://localhost:4000/api/urgent-issues -o $null -w "%{http_code}"
```

Expected: `401`

---

## Task 5: Client types

**Files:**
- Create: `client/src/types/notes.ts`
- Create: `client/src/types/urgent-issues.ts`

- [ ] **Step 1: Create notes types**

Create `client/src/types/notes.ts`:
```typescript
export type NoteAuthor = {
  id: string;
  name: string;
  role: string;
  profile: { profilePictureUrl: string | null } | null;
};

export type ItemNote = {
  id: string;
  stockBalanceId: string;
  content: string;
  createdAt: string;
  author: NoteAuthor;
};

export type RecentNote = ItemNote & {
  stockBalance: {
    id: string;
    inventoryTableId: string | null;
    inventoryTable: { id: string; name: string } | null;
    item: { name: string };
  };
};
```

- [ ] **Step 2: Create urgent-issues types**

Create `client/src/types/urgent-issues.ts`:
```typescript
export type IssueItemSnapshot = {
  itemName: string;
  articleNumber: string | null;
  tableName: string;
  location: string | null;
  quantity: number;
  unit: string;
};

export type IssueSender = {
  id: string;
  name: string;
  role: string;
  pictureUrl: string | null;
};

export type UrgentIssue = {
  id: string;
  tableId: string;
  tableName: string;
  stockBalanceId: string;
  message: string;
  itemSnapshot: IssueItemSnapshot;
  status: "open" | "resolved";
  resolvedAt: string | null;
  createdAt: string;
  sender: IssueSender;
  resolvedBy: { id: string; name: string } | null;
};
```

---

## Task 6: Client services

**Files:**
- Create: `client/src/services/itemNotesService.ts`
- Create: `client/src/services/urgentIssuesService.ts`

- [ ] **Step 1: Create itemNotesService**

Create `client/src/services/itemNotesService.ts`:
```typescript
import type { ItemNote, RecentNote } from "../types/notes";

const BASE = "/api/item-notes";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  return (body as { data: T }).data;
}

export const itemNotesService = {
  list(stockBalanceId: string): Promise<ItemNote[]> {
    return request(`${BASE}?stockBalanceId=${encodeURIComponent(stockBalanceId)}`);
  },
  recent(tableId?: string, limit = 30): Promise<RecentNote[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tableId) params.set("tableId", tableId);
    return request(`${BASE}/recent?${params.toString()}`);
  },
  create(stockBalanceId: string, content: string): Promise<ItemNote> {
    return request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockBalanceId, content }),
    });
  },
  delete(noteId: string): Promise<void> {
    return request(`${BASE}/${noteId}`, { method: "DELETE" });
  },
};
```

- [ ] **Step 2: Create urgentIssuesService**

Create `client/src/services/urgentIssuesService.ts`:
```typescript
import type { UrgentIssue } from "../types/urgent-issues";

const BASE = "/api/urgent-issues";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  return (body as { data: T }).data;
}

export const urgentIssuesService = {
  create(tableId: string, stockBalanceId: string, message: string): Promise<UrgentIssue> {
    return request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, stockBalanceId, message }),
    });
  },
  list(status: "open" | "resolved"): Promise<UrgentIssue[]> {
    return request(`${BASE}?status=${status}`);
  },
  listMy(): Promise<UrgentIssue[]> {
    return request(`${BASE}/my`);
  },
  resolve(id: string): Promise<UrgentIssue> {
    return request(`${BASE}/${id}/resolve`, { method: "PATCH" });
  },
  unresolve(id: string): Promise<UrgentIssue> {
    return request(`${BASE}/${id}/unresolve`, { method: "PATCH" });
  },
};
```

---

## Task 7: Client hooks

**Files:**
- Create: `client/src/hooks/useItemNotes.ts`
- Create: `client/src/hooks/useUrgentIssues.ts`

- [ ] **Step 1: Create useItemNotes**

Create `client/src/hooks/useItemNotes.ts`:
```typescript
import { useCallback, useEffect, useState } from "react";
import { itemNotesService } from "../services/itemNotesService";
import type { ItemNote } from "../types/notes";

export function useItemNotes(stockBalanceId: string | undefined) {
  const [notes, setNotes] = useState<ItemNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!stockBalanceId) return;
    setLoading(true);
    setError(null);
    try {
      setNotes(await itemNotesService.list(stockBalanceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [stockBalanceId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (content: string) => {
    if (!stockBalanceId) return;
    const note = await itemNotesService.create(stockBalanceId, content);
    setNotes((prev) => [...prev, note]);
  }, [stockBalanceId]);

  const remove = useCallback(async (noteId: string) => {
    await itemNotesService.delete(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  return { notes, loading, error, add, remove, reload: load };
}
```

- [ ] **Step 2: Create useUrgentIssues**

Create `client/src/hooks/useUrgentIssues.ts`:
```typescript
import { useCallback, useEffect, useState } from "react";
import { urgentIssuesService } from "../services/urgentIssuesService";
import type { UrgentIssue } from "../types/urgent-issues";

export function useUrgentIssues() {
  const [openIssues, setOpenIssues] = useState<UrgentIssue[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<UrgentIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [open, resolved] = await Promise.all([
        urgentIssuesService.list("open"),
        urgentIssuesService.list("resolved"),
      ]);
      setOpenIssues(open);
      setResolvedIssues(resolved);
    } catch {
      setError("Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resolve = useCallback(async (id: string) => {
    const updated = await urgentIssuesService.resolve(id);
    setOpenIssues((prev) => prev.filter((i) => i.id !== id));
    setResolvedIssues((prev) => [updated, ...prev]);
  }, []);

  const unresolve = useCallback(async (id: string) => {
    const updated = await urgentIssuesService.unresolve(id);
    setResolvedIssues((prev) => prev.filter((i) => i.id !== id));
    setOpenIssues((prev) => [updated, ...prev]);
  }, []);

  return { openIssues, resolvedIssues, loading, error, resolve, unresolve };
}
```

---

## Task 8: ItemNotesPanel component

**Files:**
- Create: `client/src/components/structured-inventory/ItemNotesPanel.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/structured-inventory/ItemNotesPanel.tsx`:
```tsx
import { Send, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useItemNotes } from "../../hooks/useItemNotes";
import type { ItemNote } from "../../types/notes";
import { UserAvatar } from "../UserAvatar";

export function ItemNotesPanel({ stockBalanceId }: { stockBalanceId: string }) {
  const { user } = useAuth();
  const { notes, loading, error, add, remove } = useItemNotes(stockBalanceId);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const canWrite =
    user?.role === "admin" || user?.role === "manager" || user?.role === "employee";

  function canDelete(authorId: string) {
    if (!user) return false;
    return user.role === "admin" || user.role === "manager" || user.id === authorId;
  }

  async function handleSubmit() {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await add(content.trim());
      setContent("");
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-line">
      <div className="border-b border-line px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Notes {notes.length > 0 ? `(${notes.length})` : ""}
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {loading && <p className="text-xs text-slate-500">Loading…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!loading && notes.length === 0 && (
          <p className="text-xs text-slate-500">No notes yet. Be the first to add one.</p>
        )}
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            canDelete={canDelete(note.author.id)}
            onDelete={remove}
          />
        ))}
        <div ref={endRef} />
      </div>
      {canWrite ? (
        <div className="border-t border-line p-3">
          <textarea
            className="w-full resize-none rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
            disabled={submitting}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void handleSubmit();
            }}
            placeholder="Write a note… (Ctrl+Enter to send)"
            rows={3}
            value={content}
          />
          <button
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            disabled={!content.trim() || submitting}
            onClick={() => void handleSubmit()}
            type="button"
          >
            <Send size={14} /> {submitting ? "Sending…" : "Add note"}
          </button>
        </div>
      ) : (
        <div className="border-t border-line p-3 text-center">
          <p className="text-xs text-slate-500">View only — notes cannot be added</p>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  canDelete,
  onDelete,
}: {
  note: ItemNote;
  canDelete: boolean;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const date = new Date(note.createdAt);
  const dateStr = date.toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group rounded-lg border border-line bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar
            name={note.author.name}
            pictureUrl={note.author.profile?.profilePictureUrl}
            size={24}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{note.author.name}</p>
            <p className="text-[10px] text-slate-500">{dateStr}</p>
          </div>
        </div>
        {canDelete && (
          <button
            className="shrink-0 rounded p-1 text-slate-600 opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
            disabled={deleting}
            onClick={() => void handleDelete()}
            title="Delete note"
            type="button"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-slate-300">{note.content}</p>
    </div>
  );
}
```

---

## Task 9: UrgentIssueModal component

**Files:**
- Create: `client/src/components/structured-inventory/UrgentIssueModal.tsx`

- [ ] **Step 1: Create the modal**

Create `client/src/components/structured-inventory/UrgentIssueModal.tsx`:
```tsx
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { urgentIssuesService } from "../../services/urgentIssuesService";

type Props = {
  itemName: string;
  tableName: string;
  tableId: string;
  stockBalanceId: string;
  onClose: () => void;
};

export function UrgentIssueModal({
  itemName,
  tableName,
  tableId,
  stockBalanceId,
  onClose,
}: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (message.trim().length < 10) {
      setError("Please describe the issue (minimum 10 characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await urgentIssuesService.create(tableId, stockBalanceId, message.trim());
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send issue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-red-500/20 p-5">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              <h2 className="text-base font-semibold text-white">Report Urgent Issue</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {itemName} · {tableName}
            </p>
          </div>
          <button
            className="rounded-md p-1 text-slate-400 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {sent ? (
            <p className="py-4 text-center text-sm text-emerald-400">
              ✓ Issue reported to the table manager.
            </p>
          ) : (
            <>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Describe the issue
              </label>
              <textarea
                autoFocus
                className="w-full resize-none rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's wrong? Include location, severity, and any safety concerns…"
                rows={5}
                value={message}
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <div className="mt-4 flex justify-end gap-3">
                <button
                  className="rounded-md border border-line px-4 py-2 text-sm text-slate-400 hover:text-white"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
                  disabled={!message.trim() || submitting}
                  onClick={() => void handleSubmit()}
                  type="button"
                >
                  <AlertTriangle size={14} />
                  {submitting ? "Sending…" : "Send to Manager"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 10: Rewrite StockRowDetailsDrawer with split layout

**Files:**
- Modify: `client/src/components/structured-inventory/StockRowDetailsDrawer.tsx`

- [ ] **Step 1: Rewrite the full file**

Replace the entire content of `client/src/components/structured-inventory/StockRowDetailsDrawer.tsx` with:

```tsx
import { AlertTriangle, Pencil, Warehouse, X } from "lucide-react";
import { Modal } from "../Modal";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import { getAssignmentByStockRequest } from "../../services/warehouse.service";
import type { WarehouseStockPlacement } from "../../types/warehouse";
import type {
  ItemAttributeInput,
  StructuredStockRow,
  UpdateStockRowInput,
} from "../../types/structured-inventory";
import { EditBody, type FormState } from "./StockRowEditBody";
import { StockRowHistory } from "./StockRowHistory";
import { ItemNotesPanel } from "./ItemNotesPanel";
import { UrgentIssueModal } from "./UrgentIssueModal";

export function StockRowDetailsDrawer({
  historyKey,
  onClose,
  onSave,
  row,
  tableId,
  tableName,
}: {
  historyKey?: number;
  onClose: () => void;
  onSave: (rowId: string, input: UpdateStockRowInput) => Promise<void>;
  row: StructuredStockRow | null;
  tableId?: string;
  tableName?: string;
}) {
  const { canTakeReturn } = usePermissions();
  const [form, setForm] = useState<FormState | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [warehousePlacement, setWarehousePlacement] = useState<WarehouseStockPlacement | null>(null);

  useEffect(() => {
    setForm(row ? formFromRow(row) : null);
    setIsEditing(false);
    setMessage(null);
    setUrgentOpen(false);
    setWarehousePlacement(null);
    if (row) {
      getAssignmentByStockRequest(row.id)
        .then((result) => setWarehousePlacement(result.assignment))
        .catch(() => null);
    }
  }, [row]);

  if (!row || !form) return null;

  async function save() {
    if (!row || !form) return;
    await onSave(row.id, cleanForm(form));
    setIsEditing(false);
    setMessage("Item saved.");
  }

  return (
    <>
      <Modal maxWidth="max-w-6xl" onClose={onClose}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              Item details
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{row.item.name}</h2>
          </div>
          <div className="flex gap-2">
            {!isEditing && (
              <button
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent"
                onClick={() => setIsEditing(true)}
                type="button"
              >
                <Pencil size={16} /> Edit
              </button>
            )}
            <button
              className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Left column — item details */}
          <div className="flex-1 overflow-y-auto p-5">
            {isEditing ? (
              <EditBody form={form} update={update} />
            ) : (
              <ViewBody
                form={form}
                historyKey={historyKey}
                row={row}
                tableId={tableId}
                tableName={tableName}
                warehousePlacement={warehousePlacement}
                canReportIssue={canTakeReturn}
                onReportIssue={() => setUrgentOpen(true)}
              />
            )}
          </div>

          {/* Right column — notes */}
          <ItemNotesPanel stockBalanceId={row.id} />
        </div>

        {isEditing && (
          <footer className="flex items-center justify-between border-t border-line p-5">
            <span className="text-sm text-emerald-200">{message}</span>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-slate-200"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950"
                onClick={save}
                type="button"
              >
                Save edit
              </button>
            </div>
          </footer>
        )}
      </Modal>

      {urgentOpen && tableId && (
        <UrgentIssueModal
          itemName={row.item.name}
          tableName={tableName ?? ""}
          tableId={tableId}
          stockBalanceId={row.id}
          onClose={() => setUrgentOpen(false)}
        />
      )}
    </>
  );

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }
}

function ViewBody({
  canReportIssue,
  form,
  historyKey,
  onReportIssue,
  row,
  tableId,
  warehousePlacement,
}: {
  canReportIssue: boolean;
  form: FormState;
  historyKey?: number;
  onReportIssue: () => void;
  row: StructuredStockRow;
  tableId?: string;
  tableName?: string;
  warehousePlacement: WarehouseStockPlacement | null;
}) {
  return (
    <div className="space-y-5">
      <MediaPreview form={form} />
      <section className="grid gap-3 md:grid-cols-2">
        {detailCards(form, row).map((item) => (
          <DetailCard item={item} key={item.label} />
        ))}
      </section>
      {warehousePlacement && (
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Warehouse size={13} /> Warehouse placement
              </div>
              <p className="mt-1 font-semibold text-white">{warehousePlacement.warehouseName}</p>
              <p className="mt-0.5 text-sm text-slate-400">
                {warehousePlacement.slotDisplayName ?? warehousePlacement.slotCode} / FACK{" "}
                {warehousePlacement.slotCompartment}
              </p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-accent px-3 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-slate-950"
              to={`/warehouses/${warehousePlacement.warehouseId}`}
            >
              <Warehouse size={15} /> View in warehouse
            </Link>
          </div>
        </section>
      )}
      <AttributeWidgets attributes={form.attributes} />
      <StockRowHistory rowId={row.id} refreshKey={historyKey} />
      {canReportIssue && tableId && (
        <div className="border-t border-line pt-4">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 hover:border-red-400 hover:bg-red-500/20"
            onClick={onReportIssue}
            type="button"
          >
            <AlertTriangle size={15} /> Report Urgent Issue
          </button>
        </div>
      )}
    </div>
  );
}

function MediaPreview({ form }: { form: FormState }) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <ImagePreview alt="Item picture" label="Item picture" value={form.imageUrl} />
      <ImagePreview alt="QR code" label="QR code image" value={form.qrCodeImageUrl} />
    </section>
  );
}

function ImagePreview({ alt, label, value }: { alt: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.03] p-4">
      <h3 className="text-sm font-semibold text-white">{label}</h3>
      {value ? (
        <img
          alt={alt}
          className="mt-3 h-36 rounded-md border border-line bg-white object-contain p-2"
          src={value}
        />
      ) : (
        <p className="mt-3 text-sm text-slate-500">No image uploaded.</p>
      )}
    </div>
  );
}

function DetailCard({ item }: { item: { label: string; value: string } }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.03] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {item.label}
      </div>
      <div className="mt-2 font-semibold text-white">{item.value || "-"}</div>
    </div>
  );
}

function AttributeWidgets({ attributes }: { attributes: ItemAttributeInput[] }) {
  return (
    <section className="rounded-lg border border-line bg-white/[0.03] p-4">
      <h3 className="font-semibold text-white">Additional columns</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {attributes.length === 0 ? (
          <p className="text-sm text-slate-500">No additional columns recorded.</p>
        ) : null}
        {attributes.map((attribute) => (
          <DetailCard
            item={{
              label: attribute.name,
              value: [attribute.rawValue || "-", attribute.unit].filter(Boolean).join(" "),
            }}
            key={`${attribute.name}-${attribute.rawValue}`}
          />
        ))}
      </div>
    </section>
  );
}

function detailCards(form: FormState, row: StructuredStockRow) {
  return [
    { label: "Item name", value: form.itemName },
    { label: "Manufacturer", value: form.manufacturerName },
    { label: "Article", value: form.articleNumber },
    { label: "Alt. article", value: form.alternativeArticleNumber },
    { label: "Category", value: form.categoryName },
    { label: "Grade", value: form.grade },
    { label: "Placement type", value: placementLabel(form.locationType) },
    { label: "Location / used in", value: form.locationCode },
    { label: "Fack / compartment", value: form.compartment },
    { label: "Quantity", value: `${row.quantity} ${row.unit}` },
    { label: "Unit price", value: form.unitPrice === null ? "" : `${form.unitPrice} ${form.currency}` },
  ];
}

function placementLabel(value: FormState["locationType"]) {
  if (value === "used_in") return "Used in";
  if (value === "location_in") return "Location in";
  return "Storage location";
}

function formFromRow(row: StructuredStockRow): FormState {
  return {
    itemName: row.item.name,
    manufacturerName: row.item.manufacturer ?? "",
    categoryName: row.item.category ?? "",
    articleNumber: row.item.articleNumber ?? "",
    alternativeArticleNumber: row.item.alternativeArticleNumber ?? "",
    grade: row.item.grade ?? "",
    locationCode: row.location?.code ?? "",
    locationType: (row.location?.locationType as FormState["locationType"]) ?? "stockroom_position",
    compartment: row.compartment ?? "",
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice ?? null,
    currency: row.currency,
    notes: row.notes ?? "",
    imageUrl: row.item.imageUrl ?? "",
    qrCodeImageUrl: row.item.qrCodeImageUrl ?? "",
    attributes: row.item.attributes.map((attribute) => ({
      name: attribute.name,
      rawValue: attribute.rawValue ?? "",
      unit: attribute.unit ?? "",
    })),
  };
}

function cleanForm(form: FormState): UpdateStockRowInput {
  const cleaned = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, value === "" ? null : value])
  ) as UpdateStockRowInput;
  cleaned.attributes = form.attributes.filter(
    (attribute) => attribute.name.trim() && attribute.rawValue?.trim()
  );
  return cleaned;
}
```

- [ ] **Step 2: Verify line count**

```powershell
(Get-Content "c:\Users\othman.belal\Desktop\Web applications\Search Engine\tool-inventory-system\client\src\components\structured-inventory\StockRowDetailsDrawer.tsx").Count
```

Expected: under 350

---

## Task 11: UrgentIssuesWidget dashboard component

**Files:**
- Create: `client/src/components/dashboard/UrgentIssuesWidget.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/dashboard/UrgentIssuesWidget.tsx`:
```tsx
import { AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useUrgentIssues } from "../../hooks/useUrgentIssues";
import type { UrgentIssue } from "../../types/urgent-issues";
import { UserAvatar } from "../UserAvatar";

export function UrgentIssuesWidget() {
  const { openIssues, resolvedIssues, loading, error, resolve, unresolve } = useUrgentIssues();

  if (loading) {
    return (
      <div className="rounded-lg border border-line bg-white/[0.03] p-5">
        <p className="text-sm text-slate-500">Loading urgent issues…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-5">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <AlertTriangle size={16} className="text-red-400" />
        <h2 className="font-semibold text-white">Urgent Issues</h2>
        {openIssues.length > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            {openIssues.length}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Open column */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-red-400">
            Open
          </p>
          {openIssues.length === 0 ? (
            <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
              No open issues.
            </p>
          ) : (
            <div className="space-y-3">
              {openIssues.map((issue) => (
                <OpenIssueCard key={issue.id} issue={issue} onResolve={resolve} />
              ))}
            </div>
          )}
        </div>

        {/* Resolved column */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Resolved this week
          </p>
          {resolvedIssues.length === 0 ? (
            <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
              No resolved issues this week.
            </p>
          ) : (
            <div className="space-y-3">
              {resolvedIssues.map((issue) => (
                <ResolvedIssueCard key={issue.id} issue={issue} onUnresolve={unresolve} />
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-600">Resolved issues are kept for 7 days.</p>
        </div>
      </div>
    </section>
  );
}

function OpenIssueCard({
  issue,
  onResolve,
}: {
  issue: UrgentIssue;
  onResolve: (id: string) => Promise<void>;
}) {
  const [resolving, setResolving] = useState(false);
  const date = new Date(issue.createdAt);
  const timeAgo = formatTimeAgo(date);

  async function handleResolve() {
    setResolving(true);
    try {
      await onResolve(issue.id);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="rounded-lg border border-red-500/20 bg-white/[0.03] p-4" style={{ borderLeft: "3px solid #ef4444" }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserAvatar name={issue.sender.name} pictureUrl={issue.sender.pictureUrl} size={22} />
          <span className="text-xs font-semibold text-white">{issue.sender.name}</span>
          <span className="text-xs text-slate-500">· {timeAgo}</span>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          disabled={resolving}
          onClick={() => void handleResolve()}
          type="button"
        >
          <CheckCircle size={12} /> {resolving ? "…" : "Resolve"}
        </button>
      </div>
      <p className="mb-1 text-xs font-semibold text-amber-300">
        {issue.itemSnapshot.itemName} · {issue.tableName}
      </p>
      <p className="text-sm text-slate-300">"{issue.message}"</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        {issue.itemSnapshot.location && <span>📍 {issue.itemSnapshot.location}</span>}
        <span>Qty: {issue.itemSnapshot.quantity} {issue.itemSnapshot.unit}</span>
      </div>
    </div>
  );
}

function ResolvedIssueCard({
  issue,
  onUnresolve,
}: {
  issue: UrgentIssue;
  onUnresolve: (id: string) => Promise<void>;
}) {
  const [unresolvingState, setUnresolvingState] = useState(false);
  const date = new Date(issue.createdAt);
  const timeAgo = formatTimeAgo(date);

  async function handleUnresolve() {
    setUnresolvingState(true);
    try {
      await onUnresolve(issue.id);
    } finally {
      setUnresolvingState(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white/[0.02] p-4 opacity-70" style={{ borderLeft: "3px solid #334155" }}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserAvatar name={issue.sender.name} pictureUrl={issue.sender.pictureUrl} size={20} />
          <span className="text-xs text-slate-400">{issue.sender.name} · {timeAgo}</span>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-white disabled:opacity-50"
          disabled={unresolvingState}
          onClick={() => void handleUnresolve()}
          type="button"
        >
          <RotateCcw size={10} /> {unresolvingState ? "…" : "Unresolve"}
        </button>
      </div>
      <p className="mb-1 text-xs font-semibold text-slate-400">
        {issue.itemSnapshot.itemName} · {issue.tableName}
      </p>
      <p className="text-xs text-slate-500 line-clamp-2">"{issue.message}"</p>
      {issue.resolvedBy && (
        <p className="mt-1 text-xs text-slate-600">Resolved by {issue.resolvedBy.name}</p>
      )}
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

---

## Task 12: RecentNotesWidget dashboard component

**Files:**
- Create: `client/src/components/dashboard/RecentNotesWidget.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/dashboard/RecentNotesWidget.tsx`:
```tsx
import { MessageSquare } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { itemNotesService } from "../../services/itemNotesService";
import type { RecentNote } from "../../types/notes";
import { UserAvatar } from "../UserAvatar";

const TABLE_COLORS = [
  "text-indigo-400 border-indigo-500/30",
  "text-emerald-400 border-emerald-500/30",
  "text-amber-400 border-amber-500/30",
  "text-sky-400 border-sky-500/30",
  "text-rose-400 border-rose-500/30",
];

export function RecentNotesWidget() {
  const [notes, setNotes] = useState<RecentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("");

  useEffect(() => {
    itemNotesService
      .recent(undefined, 50)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, []);

  const tables = useMemo(() => {
    const seen = new Map<string, string>();
    for (const note of notes) {
      const t = note.stockBalance.inventoryTable;
      if (t && !seen.has(t.id)) seen.set(t.id, t.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [notes]);

  const filtered = useMemo(
    () =>
      selectedTable
        ? notes.filter((n) => n.stockBalance.inventoryTable?.id === selectedTable)
        : notes,
    [notes, selectedTable]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { tableName: string; colorClass: string; notes: RecentNote[] }>();
    const tableOrder = tables.map((t) => t.id);
    for (const note of filtered) {
      const tableId = note.stockBalance.inventoryTable?.id ?? "unknown";
      const tableName = note.stockBalance.inventoryTable?.name ?? "Unknown table";
      if (!map.has(tableId)) {
        const colorIdx = tableOrder.indexOf(tableId) % TABLE_COLORS.length;
        map.set(tableId, { tableName, colorClass: TABLE_COLORS[colorIdx], notes: [] });
      }
      map.get(tableId)!.notes.push(note);
    }
    return [...map.entries()];
  }, [filtered, tables]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-slate-400" />
          <h2 className="font-semibold text-white">Recent Notes</h2>
        </div>
        {tables.length > 1 && (
          <select
            className="rounded-md border border-line bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300"
            onChange={(e) => setSelectedTable(e.target.value)}
            value={selectedTable}
          >
            <option value="">All tables</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <p className="text-sm text-slate-500">Loading notes…</p>
      )}

      {!loading && grouped.length === 0 && (
        <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
          No notes added yet.
        </p>
      )}

      {grouped.map(([tableId, { tableName, colorClass, notes: tableNotes }]) => (
        <div key={tableId}>
          <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.14em] ${colorClass.split(" ")[0]}`}>
            {tableName}
          </p>
          <div className={`rounded-lg border bg-white/[0.02] p-3 space-y-3 ${colorClass.split(" ")[1]}`}>
            {tableNotes.map((note) => (
              <NoteRow key={note.id} note={note} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function NoteRow({ note }: { note: RecentNote }) {
  const date = new Date(note.createdAt);
  const dateStr = date.toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex gap-3">
      <UserAvatar
        name={note.author.name}
        pictureUrl={note.author.profile?.profilePictureUrl}
        size={28}
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold text-white">{note.author.name}</span>
          <span className="text-xs text-slate-500">on</span>
          <span className="text-xs font-medium text-amber-300">
            {note.stockBalance.item.name}
          </span>
          <span className="text-xs text-slate-500">· {dateStr}</span>
        </div>
        <p className="mt-0.5 text-sm text-slate-300 line-clamp-2">{note.content}</p>
      </div>
    </div>
  );
}
```

---

## Task 13: MyReportedIssuesWidget for employee dashboard

**Files:**
- Create: `client/src/components/dashboard/MyReportedIssuesWidget.tsx`

- [ ] **Step 1: Create the component**

Create `client/src/components/dashboard/MyReportedIssuesWidget.tsx`:
```tsx
import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { urgentIssuesService } from "../../services/urgentIssuesService";
import type { UrgentIssue } from "../../types/urgent-issues";

export function MyReportedIssuesWidget() {
  const [issues, setIssues] = useState<UrgentIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    urgentIssuesService
      .listMy()
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-400" />
        <h2 className="font-semibold text-white">My Reported Issues</h2>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && issues.length === 0 && (
        <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
          You have not reported any urgent issues yet.
        </p>
      )}

      <div className="space-y-3">
        {issues.map((issue) => (
          <ReportedIssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  );
}

function ReportedIssueCard({ issue }: { issue: UrgentIssue }) {
  const date = new Date(issue.createdAt);
  const dateStr = date.toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-line bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-amber-300">
          {issue.itemSnapshot.itemName} · {issue.tableName}
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            issue.status === "open"
              ? "bg-red-500/15 text-red-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {issue.status === "open" ? "Open" : "Resolved ✓"}
        </span>
      </div>
      <p className="mb-1 text-sm text-slate-300">"{issue.message}"</p>
      <p className="text-xs text-slate-500">{dateStr}</p>
      {issue.resolvedBy && (
        <p className="mt-1 text-xs text-slate-500">Resolved by {issue.resolvedBy.name}</p>
      )}
    </div>
  );
}
```

---

## Task 14: Update DashboardPage with new widgets

**Files:**
- Modify: `client/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Rewrite the dashboard page**

Replace the entire content of `client/src/pages/DashboardPage.tsx` with:

```tsx
import {
  AlertTriangle,
  Boxes,
  Factory,
  MapPinned,
  PackageSearch,
  PencilLine,
  Tags,
} from "lucide-react";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { MetricCard } from "../components/dashboard/MetricCard";
import { MyReportedIssuesWidget } from "../components/dashboard/MyReportedIssuesWidget";
import { RecentNotesWidget } from "../components/dashboard/RecentNotesWidget";
import { StatusPanel } from "../components/dashboard/StatusPanel";
import { UrgentIssuesWidget } from "../components/dashboard/UrgentIssuesWidget";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { useAuth } from "../hooks/useAuth";

const metricIcons = {
  totalTools: { icon: Boxes, tone: "accent" },
  toolTypes: { icon: Tags, tone: "blue" },
  manufacturers: { icon: Factory, tone: "blue" },
  locations: { icon: MapPinned, tone: "green" },
  lowStock: { icon: AlertTriangle, tone: "amber" },
  updatedThisWeek: { icon: PencilLine, tone: "green" },
  issueStates: { icon: PackageSearch, tone: "red" },
} as const;

export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading } = useAdminDashboard();
  const role = user?.role;
  const isManager = role === "admin" || role === "manager";
  const isEmployee = role === "employee";

  if (isLoading) return <DashboardLoading />;
  if (error || !data) return <DashboardError message={error ?? "Dashboard unavailable"} />;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <DashboardHeader lowStockThreshold={data.lowStockThreshold} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => {
          const presentation = metricIcons[metric.key as keyof typeof metricIcons];
          const Icon = presentation?.icon ?? Boxes;
          return (
            <MetricCard
              icon={Icon}
              key={metric.key}
              label={metric.label}
              tone={presentation?.tone ?? "accent"}
              value={metric.value}
            />
          );
        })}
      </section>

      <StatusPanel
        statuses={[
          data.statuses.latestImport,
          data.statuses.latestBackup,
          data.statuses.weeklyEmail,
        ]}
      />

      {isManager && (
        <div className="rounded-lg border border-line bg-white/[0.02] p-5">
          <UrgentIssuesWidget />
        </div>
      )}

      {isEmployee && (
        <div className="rounded-lg border border-line bg-white/[0.02] p-5">
          <MyReportedIssuesWidget />
        </div>
      )}

      <div className="rounded-lg border border-line bg-white/[0.02] p-5">
        <RecentNotesWidget />
      </div>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <DashboardHeader lowStockThreshold={null} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 7 }).map((_, index) => (
          <div className="h-36 animate-pulse rounded-lg border border-line bg-white/5" key={index} />
        ))}
      </div>
    </div>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-7xl">
      <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">
        {message}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify line count**

```powershell
(Get-Content "c:\Users\othman.belal\Desktop\Web applications\Search Engine\tool-inventory-system\client\src\pages\DashboardPage.tsx").Count
```

Expected: under 350

---

## Task 15: Rebuild Docker and verify

**Files:** None

- [ ] **Step 1: Check server line counts**

```powershell
cd "c:\Users\othman.belal\Desktop\Web applications\Search Engine\tool-inventory-system"
npm run check:lines
```

Fix any files over 350 lines before proceeding.

- [ ] **Step 2: Rebuild both containers**

```powershell
cd "c:\Users\othman.belal\Desktop\Web applications\Search Engine\tool-inventory-system"
docker compose build server
```
Then:
```powershell
docker compose build client
```
Then:
```powershell
docker compose up -d
```

- [ ] **Step 3: Verify server started and migration ran**

```powershell
docker logs tool_inventory_server --tail 10
```

Expected output includes: `Server listening on port 4000`

- [ ] **Step 4: Verify new tables exist in DB**

```powershell
docker exec tool_inventory_postgres psql -U tool_user -d tool_inventory -c "\dt item_notes urgent_issues"
```

Expected: two rows listing `item_notes` and `urgent_issues` tables.

- [ ] **Step 5: End-to-end smoke test**

Open http://localhost:5173, log in, navigate to any inventory table, click any row:
- Drawer opens with details on the left and a Notes panel on the right ✓
- Notes panel shows "No notes yet. Be the first to add one." ✓
- Type a note and click "Add note" — it appears immediately ✓
- Hover the note — trash icon appears, click it — note removed ✓
- Scroll to bottom of left panel — "Report Urgent Issue" button visible ✓
- Click it — red modal opens with item name and table ✓
- Type 10+ characters and click "Send to Manager" — "Issue reported" confirmation ✓
- Navigate to Dashboard — Recent Notes widget shows the note grouped by table ✓
- Log in as admin/manager — Urgent Issues widget shows the open issue with Resolve button ✓
- Click Resolve — issue moves to Resolved column with Unresolve button ✓

---

## Self-Review Notes

- `item-notes` routes use `/api/item-notes?stockBalanceId=` (query param) for listing — consistent with how services call it.
- `urgent-issues/my` route is registered before `urgent-issues/:id/resolve` — Express will not confuse `/my` with `/:id` because `my` is literal and precedes the param route.
- `UrgentIssueModal` is rendered outside `Modal` in the drawer (as a sibling in JSX) so it gets its own `z-50` overlay on top of the drawer's overlay.
- `itemSnapshot` is built server-side from live DB data at the moment of creation — client never sends item details.
- Cleanup of 7-day expired resolved issues runs inside `listUrgentIssues` before every dashboard fetch — no cron required.
- `StockRowDetailsDrawer` no longer has the static `Notes` (form.notes) section — that single-line plain-text field is replaced by the threaded `ItemNotesPanel`. The `form.notes` field still exists in `FormState` and is editable in edit mode, but is not shown in view mode since `ItemNotesPanel` supersedes it.
