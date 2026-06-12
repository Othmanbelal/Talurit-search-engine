# Resource Managers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins and managers to assign any users as resource managers of specific InventoryTables, InventoryGroups, or WarehouseLayouts, granting those users full admin-level access on that resource.

**Architecture:** A single `ResourceManager` join table (userId + resourceType enum + resourceId string) covers all three resource types. A new async middleware `requireResourceAccess` replaces `requireRoles("admin","manager")` on resource-specific write routes — it passes for admins, for users explicitly listed as a resource manager, and (for tables) for managers of the parent group. The frontend adds a reusable `ResourceManagerPicker` component wired into the table settings panel, group page, warehouse detail page, and admin users page.

**Tech Stack:** Node.js, Express, Prisma, PostgreSQL, React, TypeScript, Tailwind CSS, Zod, Lucide React

---

## Edge Cases Handled

- **Group RM inherits table access**: assigning a user as RM of a group grants full access to every table in that group; the middleware checks the table's parent group automatically.
- **Orphaned assignments**: delete service methods clean up `ResourceManager` rows when a table/group/warehouse is deleted (no FK cascade possible across heterogeneous resource types).
- **Any role can be assigned**: an employee or viewer can be a resource manager of a specific resource.
- **Only admin/manager (global role) can assign**: the assign endpoint enforces this; managers can only assign on resources they themselves manage.
- **Duplicate prevention**: `@@unique([userId, resourceType, resourceId])` constraint; service catches P2002 and returns 409.
- **Resource existence validation**: service validates the resource exists before creating the assignment.
- **Self-assignment allowed**: no restriction; useful for managers explicitly tracking their own ownership.
- **Last RM can be removed**: admins always retain access so there is no lockout risk.

---

## File Map

**Create (backend):**
- `prisma/schema.prisma` — add `ResourceType` enum + `ResourceManager` model + User relations
- `server/src/modules/resource-managers/resource-managers.schemas.ts`
- `server/src/modules/resource-managers/resource-managers.repository.ts`
- `server/src/modules/resource-managers/resource-managers.service.ts`
- `server/src/modules/resource-managers/resource-managers.controller.ts`
- `server/src/modules/resource-managers/resource-managers.routes.ts`
- `server/src/middleware/resource-access.middleware.ts`

**Modify (backend):**
- `server/src/modules/structured-inventory/structured-inventory.routes.ts` — swap `canManageData` for `requireResourceAccess` on table/group-specific routes
- `server/src/modules/warehouses/warehouse.routes.ts` — swap `canEditWarehouse`/`canDeleteWarehouse` for `requireResourceAccess`
- `server/src/modules/structured-inventory/structured-inventory.service.ts` — cleanup RM rows on delete
- `server/src/modules/warehouses/warehouse.service.ts` — cleanup RM rows on delete
- `server/src/app.ts` — register `/api/resource-managers` route

**Create (frontend):**
- `client/src/services/resourceManagerService.ts`
- `client/src/hooks/useResourceManagers.ts`
- `client/src/hooks/useMyResourceManagers.ts`
- `client/src/components/ResourceManagerPicker.tsx`

**Modify (frontend):**
- `client/src/components/structured-inventory/TableColumnSettingsPanel.tsx` — add Managers section
- `client/src/pages/StructuredInventoryGroupPage.tsx` — add Managers panel
- `client/src/pages/WarehouseDetailsPage.tsx` — add Managers panel
- `client/src/pages/AdminUsersPage.tsx` — show managed resources per user
- `client/src/hooks/usePermissions.ts` — add `canAssignResourceManagers` flag

---

## Task 1: Prisma Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ResourceType enum and ResourceManager model to schema**

Open `prisma/schema.prisma`. Add the enum right after the `UserRole` enum (around line 10). Add the model near the User model. Add relations to User.

Add enum (after `UserRole` enum):
```prisma
enum ResourceType {
  inventory_table
  inventory_group
  warehouse
}
```

Add model (after User model, before Session model):
```prisma
model ResourceManager {
  id           String       @id @default(cuid())
  userId       String
  resourceType ResourceType
  resourceId   String
  assignedById String?
  assignedAt   DateTime     @default(now())

  user         User         @relation("UserManagedResources", fields: [userId], references: [id], onDelete: Cascade)
  assignedBy   User?        @relation("UserAssignedManagers", fields: [assignedById], references: [id], onDelete: SetNull)

  @@unique([userId, resourceType, resourceId])
  @@index([resourceType, resourceId])
  @@index([userId])
  @@map("resource_managers")
}
```

Add to `model User` (inside the User model block, after `itemInteractionLogs`):
```prisma
  managedResources         ResourceManager[]         @relation("UserManagedResources")
  assignedManagers         ResourceManager[]         @relation("UserAssignedManagers")
```

- [ ] **Step 2: Run migration locally (outside Docker)**

```bash
cd tool-inventory-system
npx prisma migrate dev --name resource_managers
```

Expected: migration file created in `prisma/migrations/`, Prisma client regenerated, no errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ResourceManager model with resourceType enum"
```

---

## Task 2: resource-managers Schemas + Repository

**Files:**
- Create: `server/src/modules/resource-managers/resource-managers.schemas.ts`
- Create: `server/src/modules/resource-managers/resource-managers.repository.ts`

- [ ] **Step 1: Create schemas**

Create `server/src/modules/resource-managers/resource-managers.schemas.ts`:

```typescript
import { z } from "zod";

export const resourceTypeValues = ["inventory_table", "inventory_group", "warehouse"] as const;
export type ResourceTypeValue = (typeof resourceTypeValues)[number];

export const AssignResourceManagerSchema = z.object({
  userId: z.string().min(1),
  resourceType: z.enum(resourceTypeValues),
  resourceId: z.string().min(1),
});
export type AssignResourceManagerInput = z.infer<typeof AssignResourceManagerSchema>;

export const ListResourceManagersQuerySchema = z.object({
  resourceType: z.enum(resourceTypeValues),
  resourceId: z.string().min(1),
});
```

- [ ] **Step 2: Create repository**

Create `server/src/modules/resource-managers/resource-managers.repository.ts`:

```typescript
import type { ResourceType } from "@prisma/client";
import { prisma } from "../../db/prisma";

export async function findResourceManagers(resourceType: ResourceType, resourceId: string) {
  return prisma.resourceManager.findMany({
    where: { resourceType, resourceId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      assignedBy: { select: { id: true, name: true } },
    },
    orderBy: { assignedAt: "asc" },
  });
}

export async function findResourceManagerById(id: string) {
  return prisma.resourceManager.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function findManagedResourcesByUserId(userId: string) {
  return prisma.resourceManager.findMany({
    where: { userId },
    orderBy: { assignedAt: "asc" },
  });
}

export async function isResourceManager(userId: string, resourceType: ResourceType, resourceId: string): Promise<boolean> {
  const row = await prisma.resourceManager.findUnique({
    where: { userId_resourceType_resourceId: { userId, resourceType, resourceId } },
    select: { id: true },
  });
  return row !== null;
}

export async function createResourceManagerAssignment(
  userId: string,
  resourceType: ResourceType,
  resourceId: string,
  assignedById: string | null
) {
  return prisma.resourceManager.create({
    data: { userId, resourceType, resourceId, assignedById },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });
}

export async function deleteResourceManagerAssignment(id: string) {
  return prisma.resourceManager.delete({ where: { id } });
}

export async function deleteAllResourceManagers(resourceType: ResourceType, resourceId: string) {
  return prisma.resourceManager.deleteMany({ where: { resourceType, resourceId } });
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/resource-managers/
git commit -m "feat: resource-managers schemas and repository"
```

---

## Task 3: resource-managers Service + Controller + Routes

**Files:**
- Create: `server/src/modules/resource-managers/resource-managers.service.ts`
- Create: `server/src/modules/resource-managers/resource-managers.controller.ts`
- Create: `server/src/modules/resource-managers/resource-managers.routes.ts`

- [ ] **Step 1: Create service**

Create `server/src/modules/resource-managers/resource-managers.service.ts`:

```typescript
import type { ResourceType, UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import type { AssignResourceManagerInput } from "./resource-managers.schemas";
import {
  createResourceManagerAssignment,
  deleteAllResourceManagers,
  deleteResourceManagerAssignment,
  findManagedResourcesByUser,
  findResourceManagerById,
  findResourceManagers,
  isResourceManager,
} from "./resource-managers.repository";

export async function listResourceManagers(resourceType: ResourceType, resourceId: string) {
  return findResourceManagers(resourceType, resourceId);
}

export async function listMyManagedResources(userId: string) {
  return findManagedResourcesByUserId(userId);
}

export async function assignResourceManager(
  input: AssignResourceManagerInput,
  assignerId: string,
  assignerRole: UserRole
) {
  if (assignerRole !== "admin" && assignerRole !== "manager") {
    throw new AppError("Only admins and managers can assign resource managers.", 403);
  }

  const resourceType = input.resourceType as ResourceType;

  if (assignerRole === "manager") {
    const canAssign = await isResourceManager(assignerId, resourceType, input.resourceId);
    if (!canAssign) {
      throw new AppError("You can only assign managers for resources you yourself manage.", 403);
    }
  }

  await validateResourceExists(resourceType, input.resourceId);

  const user = await prisma.user.findUnique({
    where: { id: input.userId, isActive: true },
    select: { id: true },
  });
  if (!user) throw new AppError("User not found or inactive.", 404);

  try {
    return await createResourceManagerAssignment(input.userId, resourceType, input.resourceId, assignerId);
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      throw new AppError("This user is already a manager of this resource.", 409);
    }
    throw error;
  }
}

export async function unassignResourceManager(assignmentId: string, removerId: string, removerRole: UserRole) {
  const assignment = await findResourceManagerById(assignmentId);
  if (!assignment) throw new AppError("Assignment not found.", 404);

  if (removerRole !== "admin") {
    const canRemove = await isResourceManager(removerId, assignment.resourceType, assignment.resourceId);
    if (!canRemove) throw new AppError("You can only remove managers for resources you yourself manage.", 403);
  }

  await deleteResourceManagerAssignment(assignmentId);
}

export async function cleanupResourceManagers(resourceType: ResourceType, resourceId: string) {
  await deleteAllResourceManagers(resourceType, resourceId);
}

async function validateResourceExists(resourceType: ResourceType, resourceId: string) {
  if (resourceType === "inventory_table") {
    const row = await prisma.inventoryTable.findUnique({ where: { id: resourceId }, select: { id: true } });
    if (!row) throw new AppError("Inventory table not found.", 404);
  } else if (resourceType === "inventory_group") {
    const row = await prisma.inventoryGroup.findUnique({ where: { id: resourceId }, select: { id: true } });
    if (!row) throw new AppError("Inventory group not found.", 404);
  } else if (resourceType === "warehouse") {
    const row = await prisma.warehouseLayout.findUnique({ where: { id: resourceId }, select: { id: true } });
    if (!row) throw new AppError("Warehouse not found.", 404);
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}
```

- [ ] **Step 2: Create controller**

Create `server/src/modules/resource-managers/resource-managers.controller.ts`:

```typescript
import type { Request, Response } from "express";
import type { ResourceType } from "@prisma/client";
import { AssignResourceManagerSchema, ListResourceManagersQuerySchema } from "./resource-managers.schemas";
import {
  assignResourceManager,
  cleanupResourceManagers,
  listMyManagedResources,
  listResourceManagers,
  unassignResourceManager,
} from "./resource-managers.service";

export async function listResourceManagersController(req: Request, res: Response) {
  const query = ListResourceManagersQuerySchema.parse(req.query);
  const data = await listResourceManagers(query.resourceType as ResourceType, query.resourceId);
  res.json({ success: true, data });
}

export async function listMyManagedResourcesController(req: Request, res: Response) {
  const data = await listMyManagedResources(req.user!.id);
  res.json({ success: true, data });
}

export async function assignResourceManagerController(req: Request, res: Response) {
  const input = AssignResourceManagerSchema.parse(req.body);
  const assignment = await assignResourceManager(input, req.user!.id, req.user!.role);
  res.status(201).json({ success: true, data: assignment });
}

export async function unassignResourceManagerController(req: Request, res: Response) {
  await unassignResourceManager(req.params.id, req.user!.id, req.user!.role);
  res.status(204).send();
}
```

- [ ] **Step 3: Create routes**

Create `server/src/modules/resource-managers/resource-managers.routes.ts`:

```typescript
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  assignResourceManagerController,
  listMyManagedResourcesController,
  listResourceManagersController,
  unassignResourceManagerController,
} from "./resource-managers.controller";

export const resourceManagerRoutes = Router();

resourceManagerRoutes.use(requireAuth);

// Any authenticated user can see their own managed resources
resourceManagerRoutes.get("/my", asyncHandler(listMyManagedResourcesController));

// Listing managers for a resource: admin and manager only
resourceManagerRoutes.get(
  "/",
  requireRoles("admin", "manager"),
  asyncHandler(listResourceManagersController)
);

// Assign: service enforces admin-or-manager-who-manages-that-resource
resourceManagerRoutes.post(
  "/",
  requireRoles("admin", "manager"),
  asyncHandler(assignResourceManagerController)
);

// Unassign: service enforces admin-or-manager-who-manages-that-resource
resourceManagerRoutes.delete(
  "/:id",
  requireRoles("admin", "manager"),
  asyncHandler(unassignResourceManagerController)
);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/resource-managers/
git commit -m "feat: resource-managers service, controller, and routes"
```

---

## Task 4: resource-access Middleware

**Files:**
- Create: `server/src/middleware/resource-access.middleware.ts`

- [ ] **Step 1: Create middleware**

Create `server/src/middleware/resource-access.middleware.ts`:

```typescript
import type { NextFunction, Request, Response } from "express";
import type { ResourceType } from "@prisma/client";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { isResourceManager } from "../modules/resource-managers/resource-managers.repository";

/**
 * Passes if:
 * - user is admin (global role), OR
 * - user is explicitly assigned as ResourceManager for this resource, OR
 * - resource is an inventory_table AND user is assigned as ResourceManager for its parent group
 *
 * Use this instead of requireRoles("admin","manager") on resource-specific write routes.
 */
export function requireResourceAccess(
  resourceType: ResourceType,
  getResourceId: (req: Request) => string
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new AppError("Authentication required.", 401));

      if (req.user.role === "admin") return next();

      const resourceId = getResourceId(req);

      const isDirectRM = await isResourceManager(req.user.id, resourceType, resourceId);
      if (isDirectRM) return next();

      // For tables: also accept if user manages the parent group
      if (resourceType === "inventory_table") {
        const table = await prisma.inventoryTable.findUnique({
          where: { id: resourceId },
          select: { groupId: true },
        });
        if (table?.groupId) {
          const isGroupRM = await isResourceManager(req.user.id, "inventory_group", table.groupId);
          if (isGroupRM) return next();
        }
      }

      return next(new AppError("Insufficient permissions.", 403));
    } catch (error) {
      return next(error);
    }
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/middleware/resource-access.middleware.ts
git commit -m "feat: requireResourceAccess middleware for per-resource authorization"
```

---

## Task 5: Wire Routes (structured-inventory + warehouse + app.ts + delete cleanup)

**Files:**
- Modify: `server/src/modules/structured-inventory/structured-inventory.routes.ts`
- Modify: `server/src/modules/warehouses/warehouse.routes.ts`
- Modify: `server/src/modules/structured-inventory/structured-inventory.service.ts`
- Modify: `server/src/modules/warehouses/warehouse.service.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: Update structured-inventory routes**

In `server/src/modules/structured-inventory/structured-inventory.routes.ts`, add the import and replace `canManageData` with `requireResourceAccess` on table-specific write routes (group-specific and global create/delete keep `canManageData`):

Add import at top:
```typescript
import { requireResourceAccess } from "../../middleware/resource-access.middleware";
```

Replace table-scoped write routes (keep `canManageData` on group routes and the global `/groups` + `/tables` POST):
```typescript
// Table column settings — resource-manager aware
structuredInventoryRoutes.patch(
  "/tables/:id/columns",
  requireResourceAccess("inventory_table", (req) => req.params.id),
  asyncHandler(updateStructuredInventoryTableColumnsController)
);
structuredInventoryRoutes.post(
  "/tables/:id/duplicates/merge",
  requireResourceAccess("inventory_table", (req) => req.params.id),
  asyncHandler(mergeStructuredDuplicatesController)
);
structuredInventoryRoutes.post(
  "/tables/:id/rows",
  requireResourceAccess("inventory_table", (req) => req.params.id),
  asyncHandler(addStructuredStockRowController)
);
structuredInventoryRoutes.patch(
  "/tables/:id/rows/:rowId",
  requireResourceAccess("inventory_table", (req) => req.params.id),
  asyncHandler(updateStructuredStockRowController)
);
structuredInventoryRoutes.delete(
  "/tables/:id/rows/:rowId",
  requireResourceAccess("inventory_table", (req) => req.params.id),
  asyncHandler(deleteStructuredStockRowController)
);
structuredInventoryRoutes.post(
  "/tables/:id/rows/:rowId/archive",
  requireResourceAccess("inventory_table", (req) => req.params.id),
  asyncHandler(archiveStructuredStockRowController)
);
structuredInventoryRoutes.post(
  "/tables/:id/rows/:rowId/restore",
  requireResourceAccess("inventory_table", (req) => req.params.id),
  asyncHandler(restoreStructuredStockRowController)
);
// Group-level actions still require global manager/admin role
structuredInventoryRoutes.delete("/groups/:id", canManageData, asyncHandler(deleteStructuredInventoryGroupController));
structuredInventoryRoutes.delete("/tables/:id", canManageData, asyncHandler(deleteStructuredInventoryTableController));
```

Remove the old duplicate route definitions for those routes (the ones with `canManageData`). The final file keeps the original structure but replaces the middleware on the table-specific write lines shown above.

- [ ] **Step 2: Update warehouse routes**

In `server/src/modules/warehouses/warehouse.routes.ts`, add import:
```typescript
import { requireResourceAccess } from "../../middleware/resource-access.middleware";
```

Replace warehouse-scoped write routes with `requireResourceAccess("warehouse", (req) => req.params.id)`:
```typescript
warehouseRoutes.patch("/:id", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(updateWarehouseController));
warehouseRoutes.put("/:id/layout", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(saveWarehouseLayoutController));
warehouseRoutes.post("/:id/scene-objects/generate-shelves", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(generateShelvesFromSceneObjectController));
warehouseRoutes.post("/:id/scene-objects/generate-rack-slots", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(generateRackSlotsFromSceneObjectController));
warehouseRoutes.post("/:id/scene-objects/rack-slot-layout", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(saveRackSlotLayoutFromSceneObjectController));
warehouseRoutes.post("/:id/shelves", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(createWarehouseShelfController));
warehouseRoutes.post("/:id/shelves/generate", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(generateWarehouseShelvesController));
warehouseRoutes.patch("/:id/shelves/:shelfId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(updateWarehouseShelfController));
warehouseRoutes.delete("/:id/shelves/:shelfId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(deleteWarehouseShelfController));
warehouseRoutes.post("/:id/shelves/:shelfId/slots", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(createWarehouseSlotController));
warehouseRoutes.patch("/:id/slots/:slotId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(updateWarehouseSlotController));
warehouseRoutes.delete("/:id/slots/:slotId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(deleteWarehouseSlotController));
warehouseRoutes.post("/:id/slots/:slotId/assign", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(assignSlotController));
warehouseRoutes.delete("/:id/assignments/:assignmentId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(unassignSlotController));
warehouseRoutes.post("/:id/links/groups", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(addGroupLinkController));
warehouseRoutes.delete("/:id/links/groups/:groupId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(removeGroupLinkController));
warehouseRoutes.post("/:id/links/tables", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(addTableLinkController));
warehouseRoutes.delete("/:id/links/tables/:tableId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(removeTableLinkController));
// Delete warehouse: still admin/manager only (destructive global action)
warehouseRoutes.delete("/:id", canDeleteWarehouse, asyncHandler(deleteWarehouseController));
```

- [ ] **Step 3: Add cleanup on inventory table/group delete**

In `server/src/modules/structured-inventory/structured-inventory.service.ts`, add import and call cleanup before/after deleting:

Add import:
```typescript
import { cleanupResourceManagers } from "../resource-managers/resource-managers.service";
```

Update `deleteStructuredInventoryGroup`:
```typescript
export async function deleteStructuredInventoryGroup(id: string) {
  await getStructuredInventoryGroup(id);
  await cleanupResourceManagers("inventory_group", id);
  await deleteInventoryGroupRecord(id);
}
```

Update `deleteStructuredInventoryTable`:
```typescript
export async function deleteStructuredInventoryTable(id: string) {
  await getStructuredInventoryTable(id);
  await cleanupResourceManagers("inventory_table", id);
  await deleteInventoryTableRecord(id);
}
```

- [ ] **Step 4: Add cleanup on warehouse delete**

In `server/src/modules/warehouses/warehouse.service.ts`, find the delete function. Add import:
```typescript
import { cleanupResourceManagers } from "../resource-managers/resource-managers.service";
```

Add cleanup before/after warehouse delete (find the delete function and add `await cleanupResourceManagers("warehouse", id);` before the prisma delete call).

- [ ] **Step 5: Register routes in app.ts**

In `server/src/app.ts`, add:
```typescript
import { resourceManagerRoutes } from "./modules/resource-managers/resource-managers.routes";
```

And in the route registration section:
```typescript
app.use(`${API_PREFIX}/resource-managers`, resourceManagerRoutes);
```

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: wire resource-access middleware into inventory and warehouse routes, add delete cleanup"
```

---

## Task 6: Frontend Service + Hooks

**Files:**
- Create: `client/src/services/resourceManagerService.ts`
- Create: `client/src/hooks/useResourceManagers.ts`
- Create: `client/src/hooks/useMyResourceManagers.ts`

- [ ] **Step 1: Create service**

Create `client/src/services/resourceManagerService.ts`:

```typescript
const BASE = "/api/resource-managers";

export type ResourceManagerEntry = {
  id: string;
  userId: string;
  resourceType: "inventory_table" | "inventory_group" | "warehouse";
  resourceId: string;
  assignedAt: string;
  user: { id: string; name: string; email: string; role: string };
  assignedBy: { id: string; name: string } | null;
};

export type MyManagedResource = {
  id: string;
  resourceType: "inventory_table" | "inventory_group" | "warehouse";
  resourceId: string;
  assignedAt: string;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  const body = await res.json();
  return (body as { data: T }).data;
}

export const resourceManagerService = {
  list(resourceType: string, resourceId: string): Promise<ResourceManagerEntry[]> {
    return request(`${BASE}?resourceType=${resourceType}&resourceId=${resourceId}`);
  },

  listMy(): Promise<MyManagedResource[]> {
    return request(`${BASE}/my`);
  },

  assign(userId: string, resourceType: string, resourceId: string): Promise<ResourceManagerEntry> {
    return request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, resourceType, resourceId }),
    });
  },

  unassign(assignmentId: string): Promise<void> {
    return request(`${BASE}/${assignmentId}`, { method: "DELETE" });
  },
};
```

- [ ] **Step 2: Create useResourceManagers hook**

Create `client/src/hooks/useResourceManagers.ts`:

```typescript
import { useCallback, useEffect, useState } from "react";
import { type ResourceManagerEntry, resourceManagerService } from "../services/resourceManagerService";

export function useResourceManagers(resourceType: string, resourceId: string | undefined) {
  const [managers, setManagers] = useState<ResourceManagerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await resourceManagerService.list(resourceType, resourceId);
      setManagers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load managers");
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => { void load(); }, [load]);

  const assign = useCallback(async (userId: string) => {
    if (!resourceId) return;
    await resourceManagerService.assign(userId, resourceType, resourceId);
    await load();
  }, [resourceType, resourceId, load]);

  const unassign = useCallback(async (assignmentId: string) => {
    await resourceManagerService.unassign(assignmentId);
    await load();
  }, [load]);

  return { managers, loading, error, assign, unassign, reload: load };
}
```

- [ ] **Step 3: Create useMyResourceManagers hook**

Create `client/src/hooks/useMyResourceManagers.ts`:

```typescript
import { useEffect, useState } from "react";
import { type MyManagedResource, resourceManagerService } from "../services/resourceManagerService";

export function useMyResourceManagers() {
  const [resources, setResources] = useState<MyManagedResource[]>([]);

  useEffect(() => {
    resourceManagerService.listMy().then(setResources).catch(() => setResources([]));
  }, []);

  function isResourceManager(resourceType: string, resourceId: string): boolean {
    return resources.some((r) => r.resourceType === resourceType && r.resourceId === resourceId);
  }

  return { resources, isResourceManager };
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/services/resourceManagerService.ts client/src/hooks/useResourceManagers.ts client/src/hooks/useMyResourceManagers.ts
git commit -m "feat: resource manager frontend service and hooks"
```

---

## Task 7: ResourceManagerPicker Component

**Files:**
- Create: `client/src/components/ResourceManagerPicker.tsx`

- [ ] **Step 1: Create component**

Create `client/src/components/ResourceManagerPicker.tsx`:

```typescript
import { useEffect, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { useResourceManagers } from "../hooks/useResourceManagers";

type User = { id: string; name: string; email: string; role: string };

async function fetchAllUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users", { credentials: "include" });
  if (!res.ok) return [];
  const body = await res.json();
  return (body as { data: { users: User[] } }).data.users ?? [];
}

type Props = {
  resourceType: "inventory_table" | "inventory_group" | "warehouse";
  resourceId: string;
};

export function ResourceManagerPicker({ resourceType, resourceId }: Props) {
  const { managers, loading, error, assign, unassign } = useResourceManagers(resourceType, resourceId);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { void fetchAllUsers().then(setAllUsers); }, []);

  const assignedIds = new Set(managers.map((m) => m.userId));
  const available = allUsers.filter((u) => !assignedIds.has(u.id));

  async function handleAssign() {
    if (!selectedUserId) return;
    setAssigning(true);
    setActionError(null);
    try {
      await assign(selectedUserId);
      setSelectedUserId("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to assign manager");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(assignmentId: string) {
    setActionError(null);
    try {
      await unassign(assignmentId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove manager");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Assigned managers</p>

      {loading && <p className="text-xs text-slate-500">Loading…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {actionError && <p className="text-xs text-red-400">{actionError}</p>}

      {managers.length === 0 && !loading && (
        <p className="text-xs text-slate-500">No managers assigned yet.</p>
      )}

      <ul className="space-y-1.5">
        {managers.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-line bg-slate-900/60 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{m.user.name}</p>
              <p className="truncate text-xs text-slate-400">{m.user.email}</p>
            </div>
            <button
              aria-label={`Remove ${m.user.name}`}
              className="shrink-0 rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => void handleUnassign(m.id)}
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <select
          className="flex-1 rounded-md border border-line bg-slate-950/80 px-3 py-2 text-sm text-white"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="">Select user to add…</option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <button
          className="flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-2 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
          disabled={!selectedUserId || assigning}
          onClick={() => void handleAssign()}
        >
          {assigning ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
          Add
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ResourceManagerPicker.tsx
git commit -m "feat: ResourceManagerPicker reusable component"
```

---

## Task 8: Integrate into TableColumnSettingsPanel + Group Page

**Files:**
- Modify: `client/src/components/structured-inventory/TableColumnSettingsPanel.tsx`
- Modify: `client/src/pages/StructuredInventoryGroupPage.tsx`

- [ ] **Step 1: Add Managers section to TableColumnSettingsPanel**

In `client/src/components/structured-inventory/TableColumnSettingsPanel.tsx`:

Add import at top:
```typescript
import { ResourceManagerPicker } from "../ResourceManagerPicker";
```

Inside the settings panel JSX, after the existing `<WidgetSettings .../>` section (before the save button), add:

```typescript
<div className="border-t border-line pt-4">
  <ResourceManagerPicker resourceType="inventory_table" resourceId={table.id} />
</div>
```

- [ ] **Step 2: Add Managers section to StructuredInventoryGroupPage**

Open `client/src/pages/StructuredInventoryGroupPage.tsx`. Find where group details/settings are rendered (look for the group name/description display). Add import and a collapsible managers section:

Add import:
```typescript
import { ResourceManagerPicker } from "../components/ResourceManagerPicker";
```

Find the section with group settings buttons (near "edit group" or group metadata). Add after it:

```typescript
{canManageInventory && group.id && (
  <div className="rounded-xl border border-line bg-surface p-5">
    <ResourceManagerPicker resourceType="inventory_group" resourceId={group.id} />
  </div>
)}
```

Where `canManageInventory` comes from `usePermissions()` (already imported on most pages, or add `const { canManageInventory } = usePermissions();`).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/structured-inventory/TableColumnSettingsPanel.tsx client/src/pages/StructuredInventoryGroupPage.tsx
git commit -m "feat: ResourceManagerPicker in table settings and group page"
```

---

## Task 9: Integrate into WarehouseDetailsPage + AdminUsersPage

**Files:**
- Modify: `client/src/pages/WarehouseDetailsPage.tsx`
- Modify: `client/src/pages/AdminUsersPage.tsx`

- [ ] **Step 1: Add Managers section to WarehouseDetailsPage**

In `client/src/pages/WarehouseDetailsPage.tsx`:

Add import:
```typescript
import { ResourceManagerPicker } from "../components/ResourceManagerPicker";
```

Find the section where warehouse tabs (`shelves`, `map`, `inventory`) are rendered. Add a "Managers" panel — visible only when `canEdit` is true — alongside the existing panels or as a new tab section after the tab content:

```typescript
{canEdit && warehouse.warehouse && (
  <div className="rounded-xl border border-line bg-surface p-5">
    <ResourceManagerPicker resourceType="warehouse" resourceId={warehouse.warehouse.id} />
  </div>
)}
```

Place this after the tab-content div and before the closing page wrapper.

- [ ] **Step 2: Add managed-resources column to AdminUsersPage**

In `client/src/pages/AdminUsersPage.tsx`:

Add imports:
```typescript
import { useMyResourceManagers } from "../hooks/useMyResourceManagers";
import { resourceManagerService } from "../services/resourceManagerService";
```

The admin users page currently shows a table of users. We want to show, per user, which resources they manage. Because this is an admin page viewing OTHER users' assignments (not the current user's), we need a different approach.

Add a new `UserManagedResourcesBadge` component inline at the bottom of `AdminUsersPage.tsx`:

```typescript
function UserManagedResourcesBadge({ userId }: { userId: string }) {
  const [resources, setResources] = useState<{ resourceType: string; resourceId: string }[]>([]);
  useEffect(() => {
    resourceManagerService.listMy(); // not useful here — we need admin endpoint
    // Use the list endpoint with userId filter if available, or show nothing
    // For now load via the list endpoint per resource type — but that's expensive.
    // Instead expose via GET /api/resource-managers?userId=X (add to query schema in Task 3 if needed)
  }, [userId]);
  // ...
}
```

**Note**: Since listing a specific user's managed resources from an admin view requires querying by `userId`, extend the `ListResourceManagersQuerySchema` in `resource-managers.schemas.ts` to also accept an optional `userId` filter:

```typescript
export const ListResourceManagersQuerySchema = z.object({
  resourceType: z.enum(resourceTypeValues).optional(),
  resourceId: z.string().min(1).optional(),
  userId: z.string().optional(),
}).refine(
  (d) => (d.resourceType && d.resourceId) || d.userId,
  { message: "Provide either (resourceType + resourceId) or userId" }
);
```

Update `resource-managers.repository.ts` to handle `userId`-only queries:

```typescript
export async function findManagedResourcesByUserId(userId: string) {
  return prisma.resourceManager.findMany({
    where: { userId },
    orderBy: { assignedAt: "asc" },
  });
}
```

Update `resource-managers.controller.ts` `listResourceManagersController` to branch on query type:

```typescript
export async function listResourceManagersController(req: Request, res: Response) {
  const query = ListResourceManagersQuerySchema.parse(req.query);
  let data;
  if (query.userId) {
    data = await findManagedResourcesByUserId(query.userId);
  } else {
    data = await listResourceManagers(query.resourceType! as ResourceType, query.resourceId!);
  }
  res.json({ success: true, data });
}
```

Update `resourceManagerService.ts` to expose `listByUser`:
```typescript
listByUser(userId: string): Promise<MyManagedResource[]> {
  return request(`${BASE}?userId=${userId}`);
},
```

Now in `AdminUsersPage.tsx`, in the `UsersTable` component (or wherever each user row is rendered), add a small badge showing count of resources managed, expandable on click.

Find the existing `UsersTable` component in `client/src/components/admin/UsersTable.tsx`. Add a new column "Manages":

```typescript
// In UsersTable.tsx, import:
import { useState, useEffect } from "react";
import { resourceManagerService } from "../../services/resourceManagerService";

// Add a small sub-component for the managed-resources cell:
function ManagedResourcesCell({ userId }: { userId: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    resourceManagerService.listByUser(userId)
      .then((data) => setCount(data.length))
      .catch(() => setCount(0));
  }, [userId]);
  if (count === null) return <span className="text-slate-500 text-xs">…</span>;
  if (count === 0) return <span className="text-slate-500 text-xs">—</span>;
  return (
    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
      {count} resource{count !== 1 ? "s" : ""}
    </span>
  );
}
```

Add `<ManagedResourcesCell userId={user.id} />` as a column in the users table. The exact insertion point depends on the existing table structure — add it as the last column before the action buttons.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/WarehouseDetailsPage.tsx client/src/pages/AdminUsersPage.tsx client/src/components/admin/UsersTable.tsx client/src/modules/resource-managers/
git commit -m "feat: ResourceManagerPicker in warehouse page and managed-resources badge in admin users"
```

---

## Task 10: usePermissions Update + Docker Rebuild

**Files:**
- Modify: `client/src/hooks/usePermissions.ts`

- [ ] **Step 1: Add canAssignResourceManagers flag**

In `client/src/hooks/usePermissions.ts`, add:
```typescript
// Admin and manager can assign resource managers
canAssignResourceManagers: role === "admin" || role === "manager",
```

This flag is used by `ResourceManagerPicker` (and any other component) to conditionally render the assign UI. Update `ResourceManagerPicker.tsx` to accept an optional `canEdit?: boolean` prop (default `true`) and hide the add/remove controls when `canEdit` is false (for viewer-role users who happen to see the picker as read-only).

Update `ResourceManagerPicker` signature:
```typescript
type Props = {
  resourceType: "inventory_table" | "inventory_group" | "warehouse";
  resourceId: string;
  canEdit?: boolean;
};
export function ResourceManagerPicker({ resourceType, resourceId, canEdit = true }: Props) {
```

Wrap the add form and remove buttons in `{canEdit && ...}`.

Pass `canEdit={canManageInventory || isRM}` from each integration point. For the table settings panel and group page, pass `canEdit={canManageInventory}`. For WarehouseDetailsPage, pass `canEdit={canEdit}` (already computed). For AdminUsersPage the picker is not shown — just the count badge.

- [ ] **Step 2: Rebuild Docker containers**

```bash
cd tool-inventory-system
docker compose up --build -d
```

Expected: all three containers start, client at http://localhost:5173.

- [ ] **Step 3: Smoke test**

1. Log in as admin at http://localhost:5173
2. Open an inventory table → Table layout settings → scroll to "Assigned managers" → add a user → verify they appear
3. Open warehouse detail page → scroll to "Assigned managers" → add a user → verify
4. Open Admin → Users → verify "Manages" column shows counts
5. Log in as the assigned user → open the table → verify edit buttons are visible and actions succeed
6. Log in as a viewer who is NOT assigned → open the table → verify write actions return 403

- [ ] **Step 4: Final commit**

```bash
git add client/src/hooks/usePermissions.ts client/src/components/ResourceManagerPicker.tsx
git commit -m "feat: canAssignResourceManagers permission flag, canEdit prop on ResourceManagerPicker"
```
