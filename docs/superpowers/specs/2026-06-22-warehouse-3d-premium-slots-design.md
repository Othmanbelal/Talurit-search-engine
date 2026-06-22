# Warehouse 3D — Premium Slots, FACK Capacity, Box/Pallet & Linked Card — Design Spec
**Date:** 2026-06-22
**Status:** Draft (awaiting user review)
**Sub-project:** A of 4 (sequence: D → B → C → A)
**Builds on existing warehouse phases (W6.7) and AGENTS.md "Warehouse Integration / Assignment Rules".**

---

## Overview

The warehouse already renders per-slot euro-pallets (`WarehouseViewerPanel.buildPalletObjects`), highlights a focused slot, supports `?slot=` deep-focus, and exposes "3D" / "View in warehouse" from inventory rows. This sub-project layers four premium capabilities on that base:

- **A3 — FACK capacity model** (foundational): a slot can host up to *N* different items, where *N* is the slot's FACK count.
- **A2 — Box vs pallet**: at link time the user manually picks pallet or box; multiple containers share a slot's reserved space.
- **A1 — Premium left/right indicators**: hover/select glow + orientation (slot-1 left / slot-N right) markers on shelves/racks.
- **A4 — Linked card**: the 3D action focuses the item and shows a premium card (the table's visible columns + item icon) connected to the box/pallet by a leader line.

Constraints honoured: PostgreSQL is source of truth; the 3D layer is a visual mapping over real `StockBalance` rows; `StorageLocation.code` (P10A:1) and `StockBalance.compartment` (FACK) remain the inventory identity — FACK is **not** invented by the warehouse. Slot assignment never mutates inventory quantity/placement/FACK (per Warehouse Assignment Rules). All files stay ≤350 lines.

---

## A3 — FACK capacity model (build first; everything depends on it)

### Concept (user-specified)
- Each **slot** can have FACK turned **on/off**. When on, the user enters a **FACK count**.
- **FACK count = the slot's capacity = the number of *different items* the slot can host.**
- An item already carries its own FACK number from its inventory table (`StockBalance.compartment`). Assigning that item consumes one unit of slot capacity (`free = fackCount − activeAssignments`).
- FACK **off** → the slot is a single undivided unit (capacity = 1; current behaviour).

### Schema

`WarehouseSlot`:
```prisma
fackEnabled Boolean @default(false)
fackCount   Int?    // required when fackEnabled; the slot's distinct-item capacity
```

`WarehouseSlotAssignment`:
```prisma
containerType String  @default("pallet")  // "pallet" | "box"
fackNumber    String?                       // snapshot of the item's StockBalance.compartment at assign time
```

**Capacity / uniqueness change (important):** today `activeSlotKey String? @unique` enforces **one** active assignment per slot. To allow up to `fackCount` distinct items:
- Repurpose `activeSlotKey` to encode **(slotId + stockBalanceId)** for active assignments (null when unassigned), keeping the DB-level guard that the **same inventory row can't occupy the same slot twice**.
- Enforce the **count** limit (`active < capacity`, where `capacity = fackEnabled ? fackCount : 1`) inside the assign **transaction** (select-for-count then insert), returning a clear "Slot is full (N/N FACK used)" error.
- Keep `maxAssignments` in sync with `capacity` for any code that reads it.

> Migration note: existing assignments keep working (capacity defaults to 1; `containerType` defaults to `"pallet"`). The `activeSlotKey` recompute is a one-time data migration over active rows.

### Backend (`server/src/modules/warehouses/…`)
- **Slot config endpoint(s):**
  - `PATCH /api/warehouses/:id/slots/:slotId/fack` — body `{ enabled: boolean, count?: number }`. Validates `count ≥ 1` when enabled; rejects lowering `count` below the slot's current active-assignment count.
  - **Bulk apply:** `PATCH /api/warehouses/:id/shelves/:shelfId/fack` and `…/objects/:externalObjectId/fack` apply the same `{ enabled, count }` to every slot under a shelf or rack (your "per rack/shelf or slot").
- **Assign service** (`warehouse-slot-assign` service): add capacity check; persist `containerType` (from request) and `fackNumber` (read from the row's `StockBalance.compartment`).
- **Serializers**: slot returns `fackEnabled`, `fackCount`, `capacity`, `usedCount`, `freeCount`; each assignment returns `containerType` and `fackNumber`.
- Authorization unchanged: admin full, manager edit/assign, employee assign/unassign, viewer read-only (per Warehouse permissions rule).

### Frontend config UI
- **`WarehouseRackSlotDesigner`**: per-slot FACK toggle + count input, plus shelf-level and rack-level "apply to all" controls.
- **`WarehouseSlotAssignPanel`**: header shows `FACK used N / capacity`; assignment is blocked with a clear message when full; the list of current assignments shows each item's FACK number + container type.

---

## A2 — Box vs pallet rendering

### Choice at link
- `WarehouseSlotAssignPanel` assign action gains a **pallet / box** choice (purely manual — no auto-suggestion). The choice is sent as `containerType`.

### Rendering (`WarehouseViewerPanel.buildPalletObjects` → generalised to `buildContainerObjects`)
- A slot's section width (currently `rackWidth / totalSlots`) is **subdivided among its active assignments** (up to `fackCount`), so multiple containers sit **side-by-side within the slot's reserved space**, each in its own FACK sub-cell.
- **Pallet** → existing `createEuroPalletDetailMesh` (sized to the sub-cell).
- **Box** → new `createBoxMesh` (a cardboard-style box). **Size and in-cell position vary deterministically**, seeded by the item id (stable across reloads) — realistic look without semantic meaning. Box stays within its sub-cell bounds.
- Container objects keep `metadata.slotId` + `metadata.assignmentId` so clicks resolve to the right item (A4).
- Focus highlight (green) applies to the focused item's container.

### Engine
- Add `createBoxMesh` to `engine/objectMeshes.ts` (or a new `engine/boxMeshes.ts` if size warrants), exported through `babylonMeshes.ts`, and a `"box"` case in `Warehouse3DView.buildObjectMesh`.
- A small seeded PRNG util (`utils/seededVariation.ts`) maps an id → stable size/offset jitter.

---

## A1 — Premium left/right indicators + hover/select

### Interaction
- Add **pointer-move hover** picking in `Warehouse3DView` (today only `POINTERUP` click is handled). Track a `hoveredObjectId`.
- **Premium selection/hover feedback:** rim-light glow + a thin accent outline on the hovered/selected rack (emissive on the merged rack material, or a Babylon `HighlightLayer` for a clean rim).

### Orientation indicators
- On hover/select of a rack/shelf, show lightweight **overlay marker meshes** (not merged into the rack, so they toggle without rebuilding):
  - Glowing **accent bars** down the left and right ends of the rack.
  - Small **"slot 1" (left)** and **"slot N" (right)** markers, matching the designer's LEFT/RIGHT convention.
- Markers are `isPickable = false` and disposed when hover/select clears.

### Files
- Extract indicator/highlight logic into `engine/interactionOverlays.ts` to keep `Warehouse3DView.tsx` under 350 lines.

---

## A4 — 3D action → navigate + highlight + premium linked card

### Existing path (reused)
- Inventory row "3D" / "View in warehouse" already routes to `/warehouses/:id?slot=…`; `WarehouseDetailsPage` reads `?slot=` and `WarehouseViewerPanel` focuses + greens the container. This stays.

### New premium linked card
- When arriving via `?slot=` (or clicking an occupied container), show a **premium card overlay** anchored in the 3D viewport:
  - Content = the **inventory table's visible columns** for that row (reuse the table's `columnSettings` visible-column logic) + the **item image/icon** (`InventoryItem.imageUrl`, placeholder fallback), name, table, placement (`P10A:1 / FACK x`), quantity, and container type.
  - **Visually connected** to the highlighted box/pallet by a **leader line/connector** (an SVG/CSS overlay drawn from the card to the projected screen position of the focused container; updates on camera move).
  - Actions: "Open inventory row" (opens the existing `StockRowDetailsDrawer`) and dismiss.
- Component: `components/warehouses/WarehouseLinkedItemCard.tsx`; screen-projection helper reads the focused mesh's world center via the Babylon camera (`Vector3.Project`).

### Data
- The viewer needs the focused assignment's full row data + the table's visible columns. Extend the shelf-view/assignment serializer (or a focused `GET /api/warehouses/:id/slots/:slotId/assignments`) to include the item image and the resolved visible-column values, so the card matches the table exactly.

---

## Database changes (summary, as requested)

- **`WarehouseSlot`**: `+fackEnabled Boolean @default(false)`, `+fackCount Int?`
- **`WarehouseSlotAssignment`**: `+containerType String @default("pallet")`, `+fackNumber String?`; **repurpose `activeSlotKey`** to (slotId + stockBalanceId) so a slot can hold up to `fackCount` distinct items (capacity enforced in the assign transaction)
- **No change** to `StorageLocation`, `StockBalance`, or inventory identity. FACK remains `StockBalance.compartment`; slot assignment remains a visual layer that never rewrites inventory fields.
- One-time data migration: recompute `activeSlotKey` for existing active assignments; defaults cover the rest.

---

## Permissions

| Action | admin | manager | employee | viewer |
|--------|-------|---------|----------|--------|
| Configure FACK (slot/shelf/rack) | ✓ | ✓ | ✗ | ✗ |
| Assign/unassign (pick box/pallet) | ✓ | ✓ | ✓ | ✗ |
| Hover/select, view linked card | ✓ | ✓ | ✓ | ✓ |

---

## Testing

**Backend**
- FACK config: enabling requires count ≥ 1; cannot lower count below active assignments; bulk apply hits every slot under the shelf/rack.
- Capacity: assigning up to `fackCount` distinct items succeeds; the (N+1)th is rejected; the same row can't be assigned twice; unassign frees capacity.
- Assignment persists `containerType` + `fackNumber`; serializers expose `capacity/used/free`.
- Assignment still does **not** mutate inventory quantity/placement/FACK.

**Frontend**
- Multiple containers render side-by-side within one slot; boxes vary deterministically (same id → same look across reloads); pallet vs box matches the chosen `containerType`.
- Hover shows glow + L/R orientation markers; markers clear on mouse-out.
- 3D action focuses the right container and shows the linked card with the table's visible columns + icon; the connector tracks the container on camera move; "Open inventory row" opens the drawer.

---

## Rollout / verification

Standard gate: `npm run lint && npm run build && npm run check:lines && docker compose up -d --build server client`. Manual pass: enable FACK=3 on a slot (and bulk-apply to a rack), assign 3 different items (mixing box/pallet), confirm the 4th is blocked, confirm side-by-side rendering, hover for L/R markers, then from an inventory row click "3D" and confirm focus + connected linked card. Update `PLAN.md` per phase (A3 → A2 → A1 → A4).

---

## Implementation phasing (one spec, built in order)

1. **A3 — FACK model**: schema, capacity logic, config endpoints, designer/assign-panel UI.
2. **A2 — Box/pallet**: container choice at link, box mesh, side-by-side sub-cell rendering.
3. **A1 — Premium indicators**: hover picking, glow/highlight, orientation markers.
4. **A4 — Linked card**: focused-assignment data, premium card + leader-line connector.

Each phase ends with the standard verification gate and a `PLAN.md` update before the next begins.
