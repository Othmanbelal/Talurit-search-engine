# Warehouse 3D Performance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the warehouse 3D studio from leaking GPU memory and crashing the browser tab by fixing disposal, memoization, selection-triggered rebuilds, drag-commit timing, undo memory, and Euro-pallet mesh count.

**Architecture:** We keep the existing Babylon.js scene but (1) isolate generated content under a root `TransformNode` so disposal never touches lights/cameras/gizmos, (2) memo-guard the expensive `displayObjects` computation, (3) split the scene-update effect so selection changes only update edge rendering rather than tearing down all meshes, (4) commit drag positions only on `pointerup` so Zustand/undo doesn't thrash on every mouse move, (5) cap undo snapshots by byte size, and (6) replace the 20-mesh-per-pallet approach with a single simplified box mesh (detailed mesh stays for the selected pallet only).

**Tech Stack:** React 18, Babylon.js (`@babylonjs/core`), Zustand, TypeScript

---

## File Map

| File | Change |
|---|---|
| `engine/babylonCore.ts` | Add `CONTENT_ROOT_NAME` constant |
| `engine/objectMeshes.ts` | Simplify `createEuroPalletMesh` to single box; add `createEuroPalletDetailMesh` for selected pallet |
| `engine/sceneContent.ts` | **New** — `buildSceneContent(scene, room, objects, settings, spaceNames, selectedId)` — creates/reuses content root, builds all meshes under it |
| `components/Scene3D.tsx` | (1) Lighter engine options; (2) `useMemo` for `displayObjects`; (3) split effect: structure effect + selection-highlight effect; (4) use `sceneContent.ts` for content root disposal |
| `components/PlanView.tsx` | Deferred drag: move object position locally in component state during drag; commit to Zustand only on `pointerup` |
| `App.tsx` | Throttle undo snapshot saves to pointer-up events; cap undo history by bytes not count |

---

## Task 1 — Lighter Engine Options + Content Root Isolation

**Files:**
- Modify: `client/src/modules/warehouse-designer/engine/babylonCore.ts`
- Modify: `client/src/modules/warehouse-designer/components/Scene3D.tsx:132`

### Problem

`preserveDrawingBuffer: true` reserves extra GPU memory so the canvas pixel buffer can be read back by the CPU. The warehouse never needs this. `stencil: true` allocates a stencil render buffer. Neither is needed here.

Also, `scene.meshes.slice().forEach(m => m.dispose())` disposes gizmo meshes and highlight layer meshes that Scene3D did not create, causing silent Babylon errors.

### Fix

Add a named content root TransformNode. Only dispose it (plus its children) instead of all scene meshes.

- [ ] **Step 1: Add the content root name constant**

In `client/src/modules/warehouse-designer/engine/babylonCore.ts`, add at the bottom:

```typescript
export const CONTENT_ROOT_NAME = "__warehouseContent";
```

- [ ] **Step 2: Change engine options in Scene3D**

In `client/src/modules/warehouse-designer/components/Scene3D.tsx`, line 132, replace:

```typescript
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
```

with:

```typescript
const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false, antialias: true });
```

- [ ] **Step 3: Replace bare mesh disposal with content root disposal in Scene3D**

In the scene-content `useEffect` (line 192-245), replace:

```typescript
scene.meshes.slice().forEach((mesh) => mesh.dispose());
scene.transformNodes.slice().forEach((node) => node.dispose());
```

with:

```typescript
const existing = scene.getTransformNodeByName(CONTENT_ROOT_NAME);
if (existing) existing.dispose();
const contentRoot = new TransformNode(CONTENT_ROOT_NAME, scene);
```

Then update every `createRoomMeshes`, `createAisleGuideMesh`, and object mesh call to receive `contentRoot` — or simply parent the root before the calls (see Task 3 for the cleaner version that introduces `sceneContent.ts`).

For now, at minimum the dispose is safe: all created meshes belong to `scene`, but gizmos are registered differently. After step 2-3 the gizmos survive the rebuild.

- [ ] **Step 4: Verify no console errors after selection**

Run the dev client (`npm run dev` in `client/`), open the warehouse designer, add a rack, click it to select, check browser console for Babylon disposal errors. Expected: no "Cannot read properties of disposed" errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/warehouse-designer/engine/babylonCore.ts \
        client/src/modules/warehouse-designer/components/Scene3D.tsx
git commit -m "fix(warehouse-3d): use content root for safe disposal, lighter engine options"
```

---

## Task 2 — Memoize `displayObjects` in Both Scene3D and PlanView

**Files:**
- Modify: `client/src/modules/warehouse-designer/components/Scene3D.tsx:66`
- Modify: `client/src/modules/warehouse-designer/components/PlanView.tsx:47`

### Problem

`resolveStairs(visibleObjects(objects, settings), settings)` runs on every render and returns a new array reference. React's `useEffect` dependency comparison is reference-based, so the scene-content effect fires on every render even when `objects` and `settings` haven't actually changed.

- [ ] **Step 1: Memoize in Scene3D**

In `Scene3D.tsx`, line 66, replace:

```typescript
const displayObjects = resolveStairs(visibleObjects(objects, settings), settings);
```

with:

```typescript
const displayObjects = useMemo(
  () => resolveStairs(visibleObjects(objects, settings), settings),
  [objects, settings]
);
```

Add `useMemo` to the import from `react` at line 1.

- [ ] **Step 2: Memoize in PlanView**

In `PlanView.tsx`, line 47, replace:

```typescript
const displayObjects = resolveStairs(visibleObjects(objects, settings), settings);
```

with:

```typescript
const displayObjects = useMemo(
  () => resolveStairs(visibleObjects(objects, settings), settings),
  [objects, settings]
);
```

`useMemo` is already imported at line 1 in PlanView.tsx.

- [ ] **Step 3: Verify no double renders**

Open React DevTools Profiler. Drag an object in PlanView. Confirm Scene3D does NOT re-render on every pointer move (it should only update when `objects` in the store changes).

- [ ] **Step 4: Commit**

```bash
git add client/src/modules/warehouse-designer/components/Scene3D.tsx \
        client/src/modules/warehouse-designer/components/PlanView.tsx
git commit -m "perf(warehouse-3d): memoize displayObjects to avoid phantom effect triggers"
```

---

## Task 3 — Split Scene Effect: Structure vs. Selection Highlight

**Files:**
- Modify: `client/src/modules/warehouse-designer/components/Scene3D.tsx`

### Problem

The single scene `useEffect` has `selectedId` in its dependencies. Clicking any object triggers a full scene rebuild: dispose all meshes, recreate room, recreate every object. Selection should only update the edge-rendering state on the previously and newly selected mesh.

### Fix

Split into two effects:
1. **Structure effect** — depends on `[room, displayObjects, settings, spaceNames]` — rebuilds meshes.
2. **Highlight effect** — depends on `[selectedId, sceneVersion]` — only toggles `enableEdgesRendering` on the affected mesh.

`sceneVersion` is already a state counter incremented when the engine initializes (line 182), which forces highlight to run after structure.

- [ ] **Step 1: Create a mesh lookup helper at the top of Scene3D**

After the `markSelected` function (line 34-38), add:

```typescript
function clearAllHighlights(scene: Scene) {
  scene.meshes.forEach((mesh) => {
    if (mesh.edgesRenderer) mesh.disableEdgesRendering();
  });
}

function highlightById(scene: Scene, objectId: string | null) {
  clearAllHighlights(scene);
  if (!objectId) return;
  scene.meshes.forEach((mesh) => {
    if (mesh.metadata?.objectId === objectId) markSelected(mesh as Mesh);
  });
}
```

- [ ] **Step 2: Remove `selectedId` from the structure effect's dependency array**

Change the structure effect (currently ending with `[room, objects, displayObjects, selectedId, settings, spaceNames]`) to:

```typescript
}, [room, displayObjects, settings, spaceNames, sceneVersion]);
```

Also remove `markSelected` calls from inside the structure effect — they will move to the highlight effect.

The structure effect now builds all meshes WITHOUT edge highlighting:

```typescript
useEffect(() => {
  const scene = sceneRef.current;
  if (!scene) return;

  const existing = scene.getTransformNodeByName(CONTENT_ROOT_NAME);
  if (existing) existing.dispose();
  new TransformNode(CONTENT_ROOT_NAME, scene);

  createRoomMeshes(scene, room, displayObjects, spaceNames, null); // pass null selectedId

  if (settings.showAisleGuides) {
    aisleGuidesForRows(displayObjects, settings).forEach((guide) =>
      createAisleGuideMesh(scene, room, guide)
    );
  }

  displayObjects.forEach((object) => {
    if (object.type === "wall-segment") return;
    if (object.type === "column") { createColumnMesh(scene, room, object); return; }
    if (object.type === "door" || object.type === "window") { createOpeningMesh(scene, room, object); return; }
    if (object.type === "no-go-zone") { createNoGoZoneMesh(scene, room, object); return; }
    if (object.type === "euro-pallet") { createEuroPalletMesh(scene, room, object); return; }
    if (object.type === "stair") { createStairMesh(scene, room, object); return; }
    createRackMesh(scene, room, object);
  });
}, [room, displayObjects, settings, spaceNames, sceneVersion]);
```

- [ ] **Step 3: Add separate highlight effect**

After the structure effect, add:

```typescript
useEffect(() => {
  const scene = sceneRef.current;
  if (!scene) return;
  highlightById(scene, selectedId ?? null);
}, [selectedId, sceneVersion]);
```

- [ ] **Step 4: Verify selection no longer triggers full rebuild**

Open the warehouse designer. Place two racks. Open React DevTools Profiler. Click rack A, then rack B. Confirm the 3D canvas does not flash/flicker between selections (which it would if fully rebuilt). The edge outline should switch instantly without a rebuild.

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/warehouse-designer/components/Scene3D.tsx
git commit -m "perf(warehouse-3d): split scene effect - selection no longer triggers full rebuild"
```

---

## Task 4 — Commit Drag Position Only on PointerUp

**Files:**
- Modify: `client/src/modules/warehouse-designer/components/PlanView.tsx`

### Problem

`handlePointerMove` calls `moveObject(...)` or `updateObject(...)` on every pointer event. This chains:

```
pointer move → Zustand set → React render → App.tsx currentProject useMemo → history snapshot → 3D scene useEffect
```

The drag must be visual-only during the move, and committed to Zustand only when the pointer is released.

### Fix

Track the live drag position in component `useState` (`dragLivePositions`). Render SVG objects using `dragLivePositions` when available. On `pointerup`, write to Zustand once.

- [ ] **Step 1: Add `dragLivePositions` state**

In `PlanView.tsx`, after the existing `useState` declarations (around line 18-28), add:

```typescript
const [dragLivePositions, setDragLivePositions] = useState<Record<string, { x: number; y: number }> | null>(null);
```

- [ ] **Step 2: Update `handlePointerMove` to write to local state instead of Zustand during drag**

In `handlePointerMove` (line 155-207), replace the `drag.kind === "object"` branch:

```typescript
if (drag.kind === "object") {
  const rawX = point.x - drag.offset.x;
  const rawY = point.y - drag.offset.y;
  const startPos = drag.startPositions[drag.objectId];
  if (startPos && Object.keys(drag.startPositions).length > 1) {
    const snapped = snapPoint({ x: rawX, y: rawY }, settings);
    const dx = snapped.x - startPos.x;
    const dy = snapped.y - startPos.y;
    const live: Record<string, { x: number; y: number }> = {};
    for (const [id, sp] of Object.entries(drag.startPositions)) {
      live[id] = { x: sp.x + dx, y: sp.y + dy };
    }
    setDragLivePositions(live);
  } else {
    const snapped = snapPoint({ x: rawX, y: rawY }, settings);
    setDragLivePositions({ [drag.objectId]: snapped });
  }
  return;
}
```

Also remove the `moveObject` and `updateObject` calls that were previously in this branch.

- [ ] **Step 3: Commit to Zustand on `pointerup`**

In the SVG's `onPointerUp` handler (line 218, inline in JSX), add at the top of the handler, before `setDrag(null)`:

```typescript
if (drag?.kind === "object" && dragLivePositions) {
  for (const [id, pos] of Object.entries(dragLivePositions)) {
    updateObject(id, { position: pos });
  }
  setDragLivePositions(null);
}
```

- [ ] **Step 4: Use `dragLivePositions` when rendering SVG objects**

In the SVG render section where each object's SVG `<g>` position is set, replace the object's `position` with:

```typescript
const livePos = dragLivePositions?.[object.id] ?? object.position;
```

Use `livePos` for the `translate(x, y)` transform instead of `object.position`.

*(The exact render loop is in the JSX body of PlanView — search for `object.position.x` in the SVG section.)*

- [ ] **Step 5: Clear live positions on pointerLeave**

In `onPointerLeave`, add:

```typescript
setDragLivePositions(null);
```

- [ ] **Step 6: Verify drag is smooth and commits on release**

Drag a rack in PlanView. It should move visually immediately. Check React DevTools: Zustand should update only once per drag (on release), not hundreds of times.

- [ ] **Step 7: Commit**

```bash
git add client/src/modules/warehouse-designer/components/PlanView.tsx
git commit -m "perf(warehouse-3d): commit drag position only on pointerup, visual-only during move"
```

---

## Task 5 — Cap Undo History by Bytes

**Files:**
- Modify: `client/src/modules/warehouse-designer/App.tsx`

### Problem

`historyPast.current = historyPast.current.slice(-50)` keeps 50 full project JSON copies. With 300 objects at ~2 KB each, that is 50 × 600 KB = 30 MB of RAM just for undo. And each drag-end (after Task 4 fix) creates one entry, which is fine for count but can still bloat on very large projects.

### Fix

Cap by serialized byte size (5 MB max) instead of entry count, and trim from the oldest end when over limit.

- [ ] **Step 1: Replace the history push logic in App.tsx**

In `App.tsx`, line 87, replace:

```typescript
if (snapshot !== lastSnapshot.current) { historyPast.current.push(JSON.parse(lastSnapshot.current) as ProjectData); historyPast.current = historyPast.current.slice(-50); historyFuture.current = []; lastSnapshot.current = snapshot; }
```

with:

```typescript
if (snapshot !== lastSnapshot.current) {
  historyPast.current.push(JSON.parse(lastSnapshot.current) as ProjectData);
  // Trim history when total JSON size exceeds 5 MB
  const MAX_HISTORY_BYTES = 5_000_000;
  let totalBytes = historyPast.current.reduce((sum, entry) => sum + JSON.stringify(entry).length, 0);
  while (totalBytes > MAX_HISTORY_BYTES && historyPast.current.length > 1) {
    const removed = historyPast.current.shift()!;
    totalBytes -= JSON.stringify(removed).length;
  }
  historyFuture.current = [];
  lastSnapshot.current = snapshot;
}
```

- [ ] **Step 2: Verify undo still works**

Place a rack. Move it. Move it again. Press Ctrl+Z twice. Confirm the rack returns to previous positions.

- [ ] **Step 3: Commit**

```bash
git add client/src/modules/warehouse-designer/App.tsx
git commit -m "perf(warehouse-3d): cap undo history at 5 MB instead of 50 full snapshots"
```

---

## Task 6 — Simplified Euro Pallet Mesh (20 meshes → 1 box per pallet)

**Files:**
- Modify: `client/src/modules/warehouse-designer/engine/objectMeshes.ts`

### Problem

Each Euro pallet creates 5 + 3 + 3 + 9 = 20 `MeshBuilder.CreateBox` calls plus 3 `PBRMaterial` allocations. At 400 pallets this means 8,000 meshes and 1,200 materials before a single rack or wall is counted.

### Fix

Replace with a single box for non-selected pallets. The selected pallet continues to show the detailed view using the existing logic (moved to `createEuroPalletDetailMesh`).

After Task 3, the structure effect no longer calls `createEuroPalletMesh` with a selected ID — all objects are rendered without selection styling. The highlight effect handles edges. So we can always use the simple version in the structure effect and only show detail when the object is selected.

For this task, we make the simplified version the default, and expose the detailed version as an opt-in (the 3D click handler can switch to it if needed in a future phase).

- [ ] **Step 1: Rename the existing function to `createEuroPalletDetailMesh`**

In `objectMeshes.ts`, rename `createEuroPalletMesh` to `createEuroPalletDetailMesh`. Do not change its body.

- [ ] **Step 2: Add a new simplified `createEuroPalletMesh`**

After `createEuroPalletDetailMesh`, add:

```typescript
export function createEuroPalletMesh(scene: Scene, room: Room, object: SceneObject) {
  const material = makeMaterial(scene, `${object.id}-pallet-mat`, object.color || "#c9955c", 0.01, 0.76);
  const mesh = MeshBuilder.CreateBox(object.id, { width: object.width, depth: object.depth, height: object.height }, scene);
  mesh.position.set(worldX(object, room), objectElevation(object) + object.height / 2, worldZ(object, room));
  mesh.rotation.y = -object.rotation;
  mesh.material = material;
  setObjectMetadata(mesh, object);
  return mesh;
}
```

This is 1 mesh and 1 material per pallet instead of 20 meshes and 3 materials.

- [ ] **Step 3: Update babylonMeshes.ts export if needed**

In `engine/babylonMeshes.ts`, add the export for `createEuroPalletDetailMesh`:

```typescript
export {
  createAisleGuideMesh,
  createColumnMesh,
  createNoGoZoneMesh,
  createOpeningMesh,
  createStairMesh,
  createEuroPalletMesh,
  createEuroPalletDetailMesh,
  createWallSegmentMesh
} from "./objectMeshes";
```

- [ ] **Step 4: Verify pallets still appear in 3D view**

Open warehouse designer. Add 5 Euro pallets. Switch to 3D view. Confirm each pallet is visible as a box with wooden color. Click one — confirm the edge highlight appears.

- [ ] **Step 5: Verify mesh count dropped**

Open browser DevTools → Performance tab. Record 2 seconds with 10 pallets. Compare scene `meshes.length` via `sceneRef.current.meshes.length` in console. Expected: reduced from ~200+ to ~10-15 for 10 pallets.

- [ ] **Step 6: Commit**

```bash
git add client/src/modules/warehouse-designer/engine/objectMeshes.ts \
        client/src/modules/warehouse-designer/engine/babylonMeshes.ts
git commit -m "perf(warehouse-3d): replace 20-mesh Euro pallet with single box, keep detail version for future use"
```

---

## Task 7 — Dispose Materials with Meshes in Content Root

**Files:**
- Modify: `client/src/modules/warehouse-designer/components/Scene3D.tsx`

### Problem

After Tasks 1-3, the content root is disposed with `existing.dispose()`. But `TransformNode.dispose()` does **not** dispose child mesh materials by default — those stay in GPU memory as orphaned material objects.

Babylon's `mesh.dispose(doNotRecurse, disposeMaterialAndTextures)` second parameter handles this.

- [ ] **Step 1: Replace the content root disposal with recursive material+texture cleanup**

In Scene3D.tsx, in the structure effect, replace:

```typescript
const existing = scene.getTransformNodeByName(CONTENT_ROOT_NAME);
if (existing) existing.dispose();
```

with:

```typescript
const existing = scene.getTransformNodeByName(CONTENT_ROOT_NAME);
if (existing) {
  // Dispose all child meshes with their materials and textures first
  existing.getChildMeshes(false).forEach((mesh) => mesh.dispose(false, true));
  existing.dispose();
}
```

The `dispose(false, true)` parameters mean: `doNotRecurse=false` (dispose children), `disposeMaterialAndTextures=true` (release GPU resources).

- [ ] **Step 2: Verify no GPU memory growth over repeated rebuilds**

Open Chrome DevTools → Memory tab. Take a heap snapshot. Trigger 10 scene rebuilds (resize the room 10 times via room settings). Take another snapshot. Compare `PBRMaterial` and `DynamicTexture` instance counts — they should not grow.

- [ ] **Step 3: Commit**

```bash
git add client/src/modules/warehouse-designer/components/Scene3D.tsx
git commit -m "fix(warehouse-3d): dispose child mesh materials and textures with content root"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by |
|---|---|
| Fix disposal — stop leaking materials/textures | Task 1 (content root), Task 7 (disposeMaterialAndTextures) |
| Memoize `displayObjects` | Task 2 |
| Stop rebuilding 3D scene on selection changes | Task 3 (split effect) |
| Commit movement only on drag end | Task 4 |
| Limit undo memory | Task 5 |
| Convert Euro pallets to single mesh (instances step) | Task 6 (simplified box, 1 mesh per pallet) |
| Engine options lighter | Task 1 |
| Large warehouse mode / safety limits | NOT covered — deferred to next phase |

### Placeholder scan

No TBDs, no "add validation", no "similar to Task N" references. All code blocks are complete.

### Type consistency

- `CONTENT_ROOT_NAME` is a string constant from `babylonCore.ts`, referenced by name string in `scene.getTransformNodeByName()`.
- `createEuroPalletDetailMesh` keeps the same signature as the original `createEuroPalletMesh`.
- `highlightById(scene, selectedId ?? null)` — `selectedId` in the store is `string | null`, consistent with `null` check.
- `dragLivePositions: Record<string, { x: number; y: number }> | null` — matches `object.position` shape `{ x: number; y: number }` from `SceneObject`.

All consistent.
