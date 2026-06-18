# Warehouse Designer — Flat-Schematic Light Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the warehouse-designer module into one soft, bright, premium *light* flat-schematic product (3D + 2D + chrome) and fix FPS at the architecture level, with zero feature/behavior regression.

**Architecture:** Stay on Babylon.js. Replace per-part PBR materials with a small set of shared, frozen, flat `StandardMaterial`s; merge each object into one mesh; drop real-time shadows/fog; add adaptive hardware scaling + FXAA + thin outlines. A single design-token source (TS + CSS variables) feeds the 3D engine, the 2D canvas, and the chrome so the three layers never drift. The light theme is scoped to the module wrapper only — the rest of the app stays dark.

**Tech Stack:** React + TypeScript + Vite + Tailwind, `@babylonjs/core` ^9.9.1. No test runner present (lint = `tsc --noEmit`); verification is type-check + `vite build` + `check:lines` + scripted browser regression.

## Global Constraints

- No source file may exceed **350 lines** (`npm run check:lines` must pass). Exceptions: `*.prisma`, `*.schema(s).ts`, `AGENTS.md`, `PLAN.md`.
- **Preservation Guarantee (controlling):** This is visual + performance only. Every existing feature must behave identically — view modes (Plan/Split/3D), picking, transform gizmo + snapping, incremental add/update/remove diff, all camera presets (iso/top/front/side/walk), 2D drawing/snapping/measurement, every object type (pallet-rack, storage-shelf, column, door, window, no-go-zone, euro-pallet, stair, wall-segment), rack slot designer, levels, inventory status linkage + click-through, all panels, keyboard shortcuts, DB persistence. If a visual/perf change would alter behavior, change the approach instead.
- Light theme is scoped to the `warehouse-designer` module wrapper; do not alter the rest of the app's dark theme.
- Babylon shared materials live for the scene lifetime. Node disposal must NOT dispose shared materials (`dispose(false, false)`); only `scene.dispose()` frees them.
- Keep UI/hooks/engine/utils separation; do not put store/API calls into engine files.
- After implementation: rebuild Docker containers (user standing instruction).
- TypeScript strict; no placeholder implementations, no fake TODOs.
- Frequent commits — one per task minimum.

---

## File Structure

New files:
- `client/src/modules/warehouse-designer/theme/designTokens.ts` — canonical color/spacing tokens (TS).
- `client/src/modules/warehouse-designer/styles/chunk-23.css` — module-scoped CSS variables (light theme) under `.wd-root`.
- `client/src/modules/warehouse-designer/engine/materialPalette.ts` — shared frozen flat materials, per-scene registry.
- `client/src/modules/warehouse-designer/engine/meshMerge.ts` — per-object merge + world-transform finalize helper.
- `client/src/modules/warehouse-designer/engine/engineSetup.ts` — engine/scene/camera creation + render budget (extracted from Scene3D to respect 350-line limit).
- `client/src/modules/warehouse-designer/engine/sceneGrid.ts` — single line-system blueprint grid.

Modified:
- `engine/sceneEnvironment.ts` — flat light, remove shadows/fog/ACES.
- `engine/babylonCore.ts` — `makeMaterial`/`makeTransparentMaterial` route to palette.
- `engine/rackMeshes.ts`, `engine/objectMeshes.ts` — palette + merge.
- `engine/roomMeshes.ts` — palette + line grid + light deck; remove inline wall edge selection.
- `engine/objectMeshCache.ts` — disposal must not dispose shared materials.
- `components/Scene3D.tsx` — use `engineSetup`, outlines, selection accent, remove shadow wiring; trim under 350 lines.
- `components/PlanView.tsx`, `components/planViewHelpers.ts` — 2D repaint to tokens.
- Chrome components + `styles/chunk-*.css` — light theme via CSS variables.
- `styles.css` — ensure `.wd-root` wraps the module and imports `chunk-23.css`.

---

## Task 1: Design tokens (TS + CSS variables)

**Files:**
- Create: `client/src/modules/warehouse-designer/theme/designTokens.ts`
- Create: `client/src/modules/warehouse-designer/styles/chunk-23.css`
- Modify: `client/src/modules/warehouse-designer/styles.css` (import chunk-23)

**Interfaces:**
- Produces: `WD_TOKENS` object with exact keys used by later tasks:
  `canvas`, `canvasDeck`, `grid`, `gridStrong`, `structure`, `structureAlt`, `shelf`, `outline`, `selection`, `wall`, `floor`, `floorRoom`, `statusFree`, `statusOccupied`, `statusProblem`, `label`, `labelWarehouse` — all hex strings (`#rrggbb`).

- [ ] **Step 1: Create the token module**

```ts
// client/src/modules/warehouse-designer/theme/designTokens.ts

/**
 * Canonical flat-schematic light palette. Single source of truth for the 3D
 * engine, the 2D canvas painter, and the chrome (via the matching CSS variables
 * in styles/chunk-23.css — keep the two in sync by name).
 *
 * Status tints are deliberately muted/desaturated: subtle, never loud.
 */
export const WD_TOKENS = {
  // Canvas / backdrop
  canvas: "#eef1f4",       // off-white/light-grey viewport
  canvasDeck: "#e4e8ec",   // ground deck under the layout
  grid: "#d4dade",         // faint blueprint grid
  gridStrong: "#c3cbd1",   // major grid lines

  // Structure (soft greys)
  structure: "#9aa6ad",    // rack uprights / frame
  structureAlt: "#b3bcc2", // beams / secondary frame
  shelf: "#c7cfd4",        // shelf decks
  wall: "#cfd6db",         // walls
  floor: "#dfe4e8",        // warehouse floor slab
  floorRoom: "#e8ecef",    // internal room floor

  // Lines / selection
  outline: "#7c878e",      // thin object outline
  selection: "#2f7df6",    // single accent for selection

  // Inventory status — muted desaturated tints
  statusFree: "#8fae93",     // sage
  statusOccupied: "#7d97b8", // dusty blue
  statusProblem: "#c19a86",  // soft clay

  // Floor labels
  label: "#6b767d",
  labelWarehouse: "#8a7d52",
} as const;

export type WdTokenKey = keyof typeof WD_TOKENS;
```

- [ ] **Step 2: Create the CSS variable block (light theme, module-scoped)**

```css
/* client/src/modules/warehouse-designer/styles/chunk-23.css */
/* Module-scoped light theme. Mirrors theme/designTokens.ts by name. */

.wd-root {
  --wd-canvas: #eef1f4;
  --wd-canvas-deck: #e4e8ec;
  --wd-grid: #d4dade;
  --wd-grid-strong: #c3cbd1;

  --wd-panel: rgba(255, 255, 255, 0.78);
  --wd-panel-solid: #f4f6f8;
  --wd-panel-border: #d3dadf;
  --wd-panel-shadow: 0 6px 24px rgba(40, 56, 70, 0.12);

  --wd-text: #2b3338;
  --wd-text-muted: #6b767d;
  --wd-text-faint: #93a0a7;

  --wd-structure: #9aa6ad;
  --wd-outline: #7c878e;
  --wd-selection: #2f7df6;

  --wd-status-free: #8fae93;
  --wd-status-occupied: #7d97b8;
  --wd-status-problem: #c19a86;

  --wd-radius: 12px;
  --wd-radius-sm: 8px;
  --wd-space: 12px;
  --wd-space-lg: 18px;
}
```

- [ ] **Step 3: Import chunk-23 from styles.css**

In `client/src/modules/warehouse-designer/styles.css`, add the import alongside the other chunk imports (match existing `@import "./styles/chunk-NN.css";` style):

```css
@import "./styles/chunk-23.css";
```

- [ ] **Step 4: Verify type-check + line count**

Run: `npm --workspace client run lint`
Expected: PASS (no type errors).
Run: `npm run check:lines`
Expected: PASS (new files are small).

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/warehouse-designer/theme/designTokens.ts client/src/modules/warehouse-designer/styles/chunk-23.css client/src/modules/warehouse-designer/styles.css
git commit -m "feat(warehouse): add flat-schematic light design tokens (TS + CSS vars)"
```

---

## Task 2: Shared flat material palette

**Files:**
- Create: `client/src/modules/warehouse-designer/engine/materialPalette.ts`

**Interfaces:**
- Consumes: `WD_TOKENS` from Task 1.
- Produces:
  - `getPalette(scene: Scene): WarehousePalette` — returns a per-scene cached palette; creates it once and stores it on `scene.metadata.wdPalette`.
  - `type WarehousePalette = { structure: StandardMaterial; structureAlt: StandardMaterial; shelf: StandardMaterial; wall: StandardMaterial; floor: StandardMaterial; floorRoom: StandardMaterial; outline: StandardMaterial; statusFree: StandardMaterial; statusOccupied: StandardMaterial; statusProblem: StandardMaterial; glass: StandardMaterial; deck: StandardMaterial }`
  - `statusMaterial(scene: Scene, status: "free" | "occupied" | "problem"): StandardMaterial`
  - `flatMaterial(scene: Scene, key: string, hex: string, alpha?: number): StandardMaterial` — shared, cached-by-key flat material for ad-hoc colors (e.g. object.color), so callers never allocate per-object materials.

- [ ] **Step 1: Implement the palette module**

```ts
// client/src/modules/warehouse-designer/engine/materialPalette.ts
import { Color3, Scene, StandardMaterial } from "@babylonjs/core";
import { WD_TOKENS } from "../theme/designTokens";

export type WarehousePalette = {
  structure: StandardMaterial;
  structureAlt: StandardMaterial;
  shelf: StandardMaterial;
  wall: StandardMaterial;
  floor: StandardMaterial;
  floorRoom: StandardMaterial;
  outline: StandardMaterial;
  statusFree: StandardMaterial;
  statusOccupied: StandardMaterial;
  statusProblem: StandardMaterial;
  glass: StandardMaterial;
  deck: StandardMaterial;
};

const hex = (value: string) => Color3.FromHexString(value);

/** Flat, frozen material: diffuse + small emissive floor so unlit faces aren't black. */
function flat(scene: Scene, name: string, color: string, alpha = 1): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  const c = hex(color);
  m.diffuseColor = c;
  m.emissiveColor = c.scale(0.55); // flat look: faces read their own color regardless of light angle
  m.specularColor = new Color3(0, 0, 0);
  m.ambientColor = c;
  if (alpha < 1) {
    m.alpha = alpha;
    m.backFaceCulling = false;
  }
  m.freeze();
  return m;
}

type SceneWithPalette = Scene & {
  metadata?: { wdPalette?: WarehousePalette; wdFlatCache?: Map<string, StandardMaterial> } & Record<string, unknown>;
};

export function getPalette(scene: Scene): WarehousePalette {
  const s = scene as SceneWithPalette;
  if (s.metadata?.wdPalette) return s.metadata.wdPalette;
  const palette: WarehousePalette = {
    structure: flat(scene, "wd-structure", WD_TOKENS.structure),
    structureAlt: flat(scene, "wd-structure-alt", WD_TOKENS.structureAlt),
    shelf: flat(scene, "wd-shelf", WD_TOKENS.shelf),
    wall: flat(scene, "wd-wall", WD_TOKENS.wall),
    floor: flat(scene, "wd-floor", WD_TOKENS.floor),
    floorRoom: flat(scene, "wd-floor-room", WD_TOKENS.floorRoom),
    outline: flat(scene, "wd-outline", WD_TOKENS.outline),
    statusFree: flat(scene, "wd-status-free", WD_TOKENS.statusFree),
    statusOccupied: flat(scene, "wd-status-occupied", WD_TOKENS.statusOccupied),
    statusProblem: flat(scene, "wd-status-problem", WD_TOKENS.statusProblem),
    glass: flat(scene, "wd-glass", WD_TOKENS.wall, 0.32),
    deck: flat(scene, "wd-deck", WD_TOKENS.canvasDeck),
  };
  s.metadata = { ...(s.metadata ?? {}), wdPalette: palette };
  return palette;
}

export function statusMaterial(scene: Scene, status: "free" | "occupied" | "problem"): StandardMaterial {
  const palette = getPalette(scene);
  if (status === "occupied") return palette.statusOccupied;
  if (status === "problem") return palette.statusProblem;
  return palette.statusFree;
}

/** Shared, cached flat material for ad-hoc colors so callers never allocate per object. */
export function flatMaterial(scene: Scene, key: string, color: string, alpha = 1): StandardMaterial {
  const s = scene as SceneWithPalette;
  const cache = s.metadata?.wdFlatCache ?? new Map<string, StandardMaterial>();
  const cacheKey = `${key}|${color}|${alpha}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;
  const material = flat(scene, `wd-flat-${cacheKey}`, color, alpha);
  cache.set(cacheKey, material);
  s.metadata = { ...(s.metadata ?? {}), wdFlatCache: cache };
  return material;
}
```

- [ ] **Step 2: Verify**

Run: `npm --workspace client run lint`
Expected: PASS.
Run: `npm run check:lines`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/modules/warehouse-designer/engine/materialPalette.ts
git commit -m "feat(warehouse): shared frozen flat material palette"
```

---

## Task 3: Per-object mesh merge helper

**Files:**
- Create: `client/src/modules/warehouse-designer/engine/meshMerge.ts`

**Interfaces:**
- Produces:
  - `finalizeMergedObject(scene, root, objectId, world): TransformNode` where
    `world = { x: number; y: number; z: number; rotationY: number }`.
  - Behavior: merges all child meshes of `root` (built at origin in local coords) into as few meshes as possible (multi-material), disposes `root` and the source children, names the result `objectId`, sets `metadata.objectId`, applies the world transform, and freezes the world matrix. Returns the merged mesh (typed as `TransformNode` so callers/cache treat it uniformly). If there is no geometry, returns an empty `TransformNode` named `objectId`.

**Why this preserves behavior:** builders today position a parent `TransformNode` at the object's world transform with children in local space. Merging children that were built at the origin bakes only local coords; then applying the *same* world transform the parent used keeps `gizmo` math (`findNode` by name/metadata, `elevationFromNode` reading `position.y`) identical.

- [ ] **Step 1: Implement the merge helper**

```ts
// client/src/modules/warehouse-designer/engine/meshMerge.ts
import { Mesh, Scene, TransformNode } from "@babylonjs/core";

export type WorldTransform = { x: number; y: number; z: number; rotationY: number };

/**
 * Merge children of `root` (built at origin, local coords) into one (multi-material)
 * mesh, then place it at `world`. Preserves picking (metadata.objectId) and the
 * exact transform semantics the old parent TransformNode used.
 */
export function finalizeMergedObject(
  scene: Scene,
  root: TransformNode,
  objectId: string,
  world: WorldTransform,
): TransformNode {
  const children = root.getChildMeshes(false).filter((m): m is Mesh => m instanceof Mesh);
  // dispose=true (sources), allow32=true, meshSubclass=undefined,
  // subdivideWithSubMeshes=false, multiMultiMaterials=true (keep distinct materials).
  const merged = children.length ? Mesh.MergeMeshes(children, true, true, undefined, false, true) : null;
  root.dispose();
  if (!merged) {
    const empty = new TransformNode(objectId, scene);
    empty.position.set(world.x, world.y, world.z);
    empty.metadata = { objectId };
    return empty;
  }
  merged.name = objectId;
  merged.position.set(world.x, world.y, world.z);
  merged.rotation.y = world.rotationY;
  merged.metadata = { objectId };
  merged.isPickable = true;
  merged.freezeWorldMatrix();
  return merged as unknown as TransformNode;
}
```

- [ ] **Step 2: Verify**

Run: `npm --workspace client run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/src/modules/warehouse-designer/engine/meshMerge.ts
git commit -m "feat(warehouse): per-object mesh merge helper preserving transforms"
```

---

## Task 4: Flat lighting environment (no shadows/fog)

**Files:**
- Modify: `client/src/modules/warehouse-designer/engine/sceneEnvironment.ts`

**Interfaces:**
- Produces (changed signature): `configureSceneEnvironment(scene: Scene, camera: ArcRotateCamera): void` — returns `void` (no `ShadowGenerator` anymore). `syncSceneShadows` is removed.
- Consumes: `WD_TOKENS`.

**Note:** Task 7 updates `Scene3D.tsx` to drop the `shadowRef`/`syncSceneShadows` usage. This task removes the shadow code here; the two must land together for the build to pass, so Task 7 depends on this task.

- [ ] **Step 1: Replace the environment with flat light**

```ts
// client/src/modules/warehouse-designer/engine/sceneEnvironment.ts
import { ArcRotateCamera, Color3, Color4, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { WD_TOKENS } from "../theme/designTokens";

/** Flat-schematic light: soft off-white backdrop, one gentle hemispheric light,
 *  no fog, no real-time shadows, neutral tone mapping. */
export function configureSceneEnvironment(scene: Scene, camera: ArcRotateCamera): void {
  const canvas = Color3.FromHexString(WD_TOKENS.canvas);
  scene.clearColor = new Color4(canvas.r, canvas.g, canvas.b, 1);
  scene.ambientColor = new Color3(0.92, 0.94, 0.96);
  scene.fogMode = Scene.FOGMODE_NONE;

  // Neutral image processing so flat colors stay true (no heavy ACES/contrast).
  scene.imageProcessingConfiguration.toneMappingEnabled = false;
  scene.imageProcessingConfiguration.contrast = 1.0;
  scene.imageProcessingConfiguration.exposure = 1.0;

  camera.fov = 0.7;
  camera.minZ = 0.08;
  camera.inertia = 0.78;
  camera.panningInertia = 0.75;
  camera.angularSensibilityX = 950;
  camera.angularSensibilityY = 950;

  const ambient = new HemisphericLight("wd-ambient", new Vector3(0.2, 1, 0.15), scene);
  ambient.intensity = 0.9;
  ambient.diffuse = new Color3(1, 1, 1);
  ambient.groundColor = new Color3(0.78, 0.82, 0.85);
  ambient.specular = new Color3(0, 0, 0);
}
```

- [ ] **Step 2: Verify type-check (expect Scene3D to break — fixed in Task 7)**

Run: `npm --workspace client run lint`
Expected: errors only in `Scene3D.tsx` referencing the removed `syncSceneShadows`/return value. That is expected; Task 7 fixes it. Do not commit a broken build alone — proceed to confirm with the next steps, OR sequence Task 4 + Task 7 in one commit. Recommended: commit Tasks 4 and 7 together.

- [ ] **Step 3: (Deferred commit)** Commit after Task 7 so the build is green. See Task 7 Step 6.

---

## Task 5: Convert object builders to palette + merge

**Files:**
- Modify: `client/src/modules/warehouse-designer/engine/babylonCore.ts`
- Modify: `client/src/modules/warehouse-designer/engine/rackMeshes.ts`
- Modify: `client/src/modules/warehouse-designer/engine/objectMeshes.ts`

**Interfaces:**
- Consumes: `getPalette`, `flatMaterial`, `statusMaterial` (Task 2); `finalizeMergedObject` (Task 3).
- Produces: same builder signatures as today (`createRackMesh`, `createColumnMesh`, `createOpeningMesh`, `createNoGoZoneMesh`, `createEuroPalletDetailMesh`, `createStairMesh`, `createWallSegmentMesh`, `createAisleGuideMesh`), each returning a node tagged with `metadata.objectId`.

**Position semantics that MUST be preserved (set as the merged node's world transform):**

| Builder | world.y | world.x / world.z | rotationY |
|---|---|---|---|
| `createRackMesh` | `objectElevation(object)` | `worldX/worldZ(object, room)` | `-object.rotation` |
| `createEuroPalletDetailMesh` | `objectElevation(object) + object.height/2` | `worldX/worldZ` | `-object.rotation` |
| `createStairMesh` | `objectElevation(object)` | `worldX/worldZ` | `-object.rotation` |
| `createColumnMesh` (single mesh, no merge needed) | `objectElevation + height/2` | `worldX/worldZ` | `-object.rotation` |
| `createOpeningMesh` | `objectElevation + sill + height/2` | `worldX/worldZ` | `-object.rotation` |
| `createNoGoZoneMesh` | `objectElevation + 0.04` | `worldX/worldZ` | `-object.rotation` |
| `createWallSegmentMesh` | `objectElevation + height/2` | `worldX/worldZ` | `-object.rotation` |

- [ ] **Step 1: Route `babylonCore` materials to the palette (flat, shared)**

Replace `makeMaterial`/`makeTransparentMaterial` bodies so they return shared flat materials instead of per-call PBR. Keep the same exported names/signatures so callers compile.

```ts
// babylonCore.ts — replace makeMaterial / makeTransparentMaterial
import { Color3, Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
import type { Room, SceneObject } from "../types";
import { flatMaterial } from "./materialPalette";

export function hexToColor3(hex: string) {
  return Color3.FromHexString(hex || "#cbd5e1");
}

/** Shared flat material (metallic/roughness args ignored; kept for signature compatibility). */
export function makeMaterial(scene: Scene, name: string, color: string, _metallic = 0.05, _roughness = 0.65) {
  return flatMaterial(scene, name.replace(/[^a-z0-9]/gi, ""), color || "#cbd5e1");
}

export function makeTransparentMaterial(scene: Scene, name: string, color: string, alpha: number) {
  return flatMaterial(scene, `t-${name.replace(/[^a-z0-9]/gi, "")}`, color || "#cbd5e1", alpha);
}
```

Keep `setObjectMetadata`, `worldX*`, `worldZ*`, `objectElevation`, `createBoxPart`, `CONTENT_ROOT_NAME` unchanged. Note `createBoxPart`'s `material` param type is `PBRMaterial | StandardMaterial`; it now receives `StandardMaterial` — already allowed.

**Important:** because `makeMaterial` now returns *shared cached* materials keyed by sanitized name+color, callers that previously passed `${object.id}-...` names will now key by a per-object string, defeating sharing. Fix callers in Steps 2–3 to use **palette materials** (by role) rather than per-object names. The `makeMaterial` shim only exists to keep ad-hoc/color-driven cases working (e.g. `object.color`), where `flatMaterial` already de-dupes by color.

- [ ] **Step 2: Rewrite `createRackMesh` to use palette + merge**

```ts
// rackMeshes.ts
import { MeshBuilder, Scene, StandardMaterial, TransformNode } from "@babylonjs/core";
import type { Room, SceneObject } from "../types";
import { createBoxPart, objectElevation, setObjectMetadata, worldX, worldZ } from "./babylonCore";
import { getPalette, flatMaterial } from "./materialPalette";
import { finalizeMergedObject } from "./meshMerge";

export function createRackMesh(scene: Scene, room: Room, object: SceneObject) {
  const rack = object.rack;
  const palette = getPalette(scene);
  const root = new TransformNode(`${object.id}__build`, scene); // built at origin

  const isLightShelf = object.type === "storage-shelf";
  const upright = palette.structure;
  // Beam keeps the object's accent color (status/inventory color-coding) but via shared cache.
  const beamMaterial = object.color ? flatMaterial(scene, "beam", object.color) : palette.structureAlt;
  const shelfMaterial = palette.shelf;
  const braceMaterial = palette.structureAlt;
  const footMaterial = palette.structure;

  const t = rack?.uprightThickness ?? (isLightShelf ? 0.035 : 0.06);
  const beam = rack?.beamThickness ?? 0.06;
  const boardH = rack?.shelfBoardThickness ?? 0.04;
  const levels = Math.max(2, rack?.levels ?? 4);
  const halfW = object.width / 2 - t / 2;
  const halfD = object.depth / 2 - t / 2;

  [
    { x: -halfW, z: -halfD }, { x: halfW, z: -halfD },
    { x: -halfW, z: halfD }, { x: halfW, z: halfD },
  ].forEach((position, index) => {
    createBoxPart(scene, root, object, `${object.id}-upright-${index}`, { width: t, depth: t, height: object.height }, { x: position.x, y: object.height / 2, z: position.z }, upright);
    createBoxPart(scene, root, object, `${object.id}-foot-${index}`, { width: t * 3.2, depth: t * 3.2, height: 0.025 }, { x: position.x, y: 0.0125, z: position.z }, footMaterial);
  });

  for (let level = 0; level < levels; level += 1) {
    const y = ((level + 1) / levels) * object.height;
    createShelfDeck(scene, root, object, level, y, boardH, shelfMaterial);
    createBoxPart(scene, root, object, `${object.id}-beam-front-${level}`, { width: object.width, depth: beam, height: beam * 1.45 }, { x: 0, y: y - boardH / 2, z: object.depth / 2 - beam / 2 }, beamMaterial);
    createBoxPart(scene, root, object, `${object.id}-beam-back-${level}`, { width: object.width, depth: beam, height: beam * 1.45 }, { x: 0, y: y - boardH / 2, z: -object.depth / 2 + beam / 2 }, beamMaterial);
  }

  if (!isLightShelf) {
    addSideBracing(scene, root, object, -halfW, t, braceMaterial);
    addSideBracing(scene, root, object, halfW, t, braceMaterial);
  }

  return finalizeMergedObject(scene, root, object.id, {
    x: worldX(object, room), y: objectElevation(object), z: worldZ(object, room), rotationY: -object.rotation,
  });
}
```

Update `createShelfDeck`/`addSideBracing` signatures so the material param type is `StandardMaterial` (was `PBRMaterial`). The bodies are unchanged except the `parent` arg is now the build `root`. `setObjectMetadata` calls inside still run (harmless; merged result re-tags anyway).

- [ ] **Step 3: Convert `objectMeshes.ts` builders**

For each builder, replace per-object `makeMaterial`/`makeTransparentMaterial(... object.id ...)` with palette or `flatMaterial(scene, <role>, object.color)` (color-driven, de-duped), and wrap multi-part builders (`createEuroPalletDetailMesh`, `createStairMesh`) with `finalizeMergedObject` using the world transforms in the table above. Single-mesh builders (`createColumnMesh`, `createWallSegmentMesh`, `createOpeningMesh`, `createNoGoZoneMesh`) keep their single mesh but use shared materials.

Concrete replacements:

```ts
// createColumnMesh: material line
const material = flatMaterial(scene, "column", object.color);
// createWallSegmentMesh: material line
const material = flatMaterial(scene, "wallseg", object.color);
// createOpeningMesh: material line (glass-like for windows, lighter for doors)
const material = flatMaterial(scene, isWindow ? "window" : "door", object.color, isWindow ? 0.38 : 0.28);
// createNoGoZoneMesh: material line
const material = flatMaterial(scene, "nogo", object.color, 0.38);
// createAisleGuideMesh: material line
const material = flatMaterial(scene, "aisle", guide.ok ? "#8fae93" : "#c19a86", 0.3);
```

For `createEuroPalletDetailMesh`: build all parts under a `root` TransformNode at origin (replace `parent` with `root`, drop `parent.position`/`parent.rotation`), use shared wood-tone flat materials via `flatMaterial(scene, "pallet-top", object.color || "#c9955c")`, `flatMaterial(scene, "pallet-side", "#b77d46")`, `flatMaterial(scene, "pallet-dark", "#8f5f35")`, then:

```ts
return finalizeMergedObject(scene, root, object.id, {
  x: worldX(object, room), y: objectElevation(object) + object.height / 2, z: worldZ(object, room), rotationY: -object.rotation,
});
```

For `createStairMesh`: build treads under `root` at origin (replace `parent` with `root`), `const stepMaterial = flatMaterial(scene, "stair", object.color || "#d6a94a");`, then:

```ts
return finalizeMergedObject(scene, root, object.id, {
  x: worldX(object, room), y: objectElevation(object), z: worldZ(object, room), rotationY: -object.rotation,
});
```

Leave `createEuroPalletMesh` (simple, currently unused by the cache) converted to `flatMaterial` for consistency but otherwise unchanged.

- [ ] **Step 4: Verify type-check + line count**

Run: `npm --workspace client run lint`
Expected: PASS (engine builder files compile; `Scene3D`/`sceneEnvironment` interplay handled in Tasks 4/7).
Run: `npm run check:lines`
Expected: PASS (rackMeshes/objectMeshes stay < 350).

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/warehouse-designer/engine/babylonCore.ts client/src/modules/warehouse-designer/engine/rackMeshes.ts client/src/modules/warehouse-designer/engine/objectMeshes.ts
git commit -m "feat(warehouse): object builders use shared flat materials + per-object merge"
```

---

## Task 6: Room meshes — palette, single-mesh grid, safe disposal

**Files:**
- Modify: `client/src/modules/warehouse-designer/engine/roomMeshes.ts`
- Create: `client/src/modules/warehouse-designer/engine/sceneGrid.ts`
- Modify: `client/src/modules/warehouse-designer/engine/objectMeshCache.ts`

**Interfaces:**
- Produces: `createBlueprintGrid(scene, room, bounds): void` in `sceneGrid.ts` — one `LineSystem` mesh for the whole grid (replaces dozens of box meshes).
- Consumes: `getPalette`, `WD_TOKENS`.

- [ ] **Step 1: Create the single-mesh blueprint grid**

```ts
// client/src/modules/warehouse-designer/engine/sceneGrid.ts
import { Color3, LinesMesh, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import type { Room } from "../types";
import { WD_TOKENS } from "../theme/designTokens";
import { worldXFromPlan, worldZFromPlan } from "./babylonCore";

type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/** One LineSystem mesh for the entire faint blueprint grid (single draw call). */
export function createBlueprintGrid(scene: Scene, room: Room, bounds: Bounds): LinesMesh {
  const lines: Vector3[][] = [];
  const y = 0.02;
  for (let x = Math.floor(bounds.minX); x <= bounds.maxX + 0.001; x += 1) {
    lines.push([
      new Vector3(worldXFromPlan(x, room), y, worldZFromPlan(bounds.minY, room)),
      new Vector3(worldXFromPlan(x, room), y, worldZFromPlan(bounds.maxY, room)),
    ]);
  }
  for (let z = Math.floor(bounds.minY); z <= bounds.maxY + 0.001; z += 1) {
    lines.push([
      new Vector3(worldXFromPlan(bounds.minX, room), y, worldZFromPlan(z, room)),
      new Vector3(worldXFromPlan(bounds.maxX, room), y, worldZFromPlan(z, room)),
    ]);
  }
  const grid = MeshBuilder.CreateLineSystem("wd-grid", { lines }, scene);
  grid.color = Color3.FromHexString(WD_TOKENS.grid);
  grid.alpha = 0.7;
  grid.isPickable = false;
  grid.freezeWorldMatrix();
  return grid;
}
```

- [ ] **Step 2: Update `roomMeshes.ts` to palette + new grid + light deck**

- Replace the three `makeMaterial(...)` calls in `createRoomMeshes` with palette materials:
  ```ts
  const palette = getPalette(scene);
  const floorMaterial = palette.floor;
  const roomFloorMaterial = palette.floorRoom;
  const wallMaterial = palette.wall;
  ```
- `createEnvironmentDeck`: use `palette.deck` (light) instead of `makeMaterial(... "#20272b" ...)`.
- `createPerimeterMarkings`: use `flatMaterial(scene, "perimeter", WD_TOKENS.labelWarehouse)`.
- Replace `createReferenceGrid(...)` call and its function body usage with `createBlueprintGrid(scene, room, polygonBounds(loops.flatMap((l) => l.points)))`. Remove the old `createReferenceGrid` function (the per-line box meshes).
- In `wallBox`, remove the inline `enableEdgesRendering` selection block (selection becomes the outline pass / accent in Task 7). Keep `setObjectMetadata(mesh, wall)` so picking/selection still resolve. Keep the `selectedId` parameter or drop it consistently across `createWallWithOpenings`/`createRoomMeshes` (Scene3D already passes `null`). Simplest: keep the params but delete the edge block.
- Update slab/label material param types from `PBRMaterial` to `StandardMaterial` where the signatures reference it (`createPolygonSlab`, `createRectSlabPiece`, `createSlabWithOptionalOpening`, `wallBox`, `createWallWithOpenings`).
- Update imports: add `getPalette`, `flatMaterial` from `./materialPalette`, `createBlueprintGrid` from `./sceneGrid`, `WD_TOKENS` from `../theme/designTokens`. Remove now-unused `PBRMaterial`/`Color4` imports if no longer referenced.

- [ ] **Step 3: Make node disposal NOT dispose shared materials**

In `objectMeshCache.ts`, change `disposeObjectNode` so it does not dispose materials/textures (they are shared, scene-lifetime):

```ts
export function disposeObjectNode(node: TransformNode): void {
  node.getChildMeshes(false).forEach((m: AbstractMesh) => m.dispose(false, false));
  (node as unknown as { dispose(a: boolean, b: boolean): void }).dispose(false, false);
}
```

(Merged objects are a single mesh; `getChildMeshes` is empty and the node itself is disposed without freeing the shared material.)

- [ ] **Step 4: Verify**

Run: `npm --workspace client run lint`
Expected: PASS (room/grid/cache compile).
Run: `npm run check:lines`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/warehouse-designer/engine/roomMeshes.ts client/src/modules/warehouse-designer/engine/sceneGrid.ts client/src/modules/warehouse-designer/engine/objectMeshCache.ts
git commit -m "feat(warehouse): light room materials, single-mesh grid, shared-material-safe disposal"
```

---

## Task 7: Engine budget, outlines, selection — Scene3D + engineSetup

**Files:**
- Create: `client/src/modules/warehouse-designer/engine/engineSetup.ts`
- Modify: `client/src/modules/warehouse-designer/components/Scene3D.tsx`

**Interfaces:**
- Produces: `createWarehouseEngine(canvas): { engine: Engine; scene: Scene; camera: ArcRotateCamera }` — creates engine (DPR-capped), scene, ArcRotateCamera (same limits/sensibility as today), calls `configureSceneEnvironment`, applies render-budget tuning (FXAA, adaptive hardware scaling toward 60fps, `blockMaterialDirtyMechanism`, `skipPointerMovePicking`), and starts the render loop. Returns handles for Scene3D to wire pointer/resize/cleanup.
- Produces: `applyObjectOutlines(scene): void` — sets thin `renderOutline` (token color) on every mesh with `metadata.objectId` (cheap now that objects are merged).
- Consumes: `configureSceneEnvironment` (Task 4), `WD_TOKENS`.

- [ ] **Step 1: Create `engineSetup.ts`**

```ts
// client/src/modules/warehouse-designer/engine/engineSetup.ts
import { ArcRotateCamera, Color3, Engine, Scene, Vector3 } from "@babylonjs/core";
import { FxaaPostProcess } from "@babylonjs/core/PostProcesses/fxaaPostProcess";
import { configureSceneEnvironment } from "./sceneEnvironment";
import { WD_TOKENS } from "../theme/designTokens";

export type WarehouseEngine = { engine: Engine; scene: Scene; camera: ArcRotateCamera };

export function createWarehouseEngine(canvas: HTMLCanvasElement): WarehouseEngine {
  // antialias off at the engine level; we use cheap FXAA + DPR cap instead of MSAA.
  const engine = new Engine(canvas, false, { preserveDrawingBuffer: false, stencil: false, antialias: false });
  engine.setHardwareScalingLevel(Math.max(1, Math.min(window.devicePixelRatio || 1, 1.5)) / (window.devicePixelRatio || 1));

  const scene = new Scene(engine);
  const camera = new ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3.2, 15, new Vector3(0, 1.5, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 3;
  camera.upperRadiusLimit = 120;
  camera.wheelPrecision = 45;
  camera.panningSensibility = 120;

  configureSceneEnvironment(scene, camera);
  new FxaaPostProcess("wd-fxaa", 1.0, camera);

  scene.skipPointerMovePicking = true;
  scene.blockMaterialDirtyMechanism = true;
  scene.autoClear = true;

  // Adaptive resolution: if the frame time is heavy, render at lower internal res.
  let scaling = engine.getHardwareScalingLevel();
  scene.onAfterRenderObservable.add(() => {
    const fps = engine.getFps();
    if (fps < 45 && scaling < 2) { scaling = Math.min(2, scaling + 0.15); engine.setHardwareScalingLevel(scaling); }
    else if (fps > 58 && scaling > 0.75) { scaling = Math.max(0.75, scaling - 0.05); engine.setHardwareScalingLevel(scaling); }
  });

  engine.runRenderLoop(() => scene.render());
  return { engine, scene, camera };
}

/** Thin blueprint outline on every object mesh (merged → cheap). */
export function applyObjectOutlines(scene: Scene): void {
  const color = Color3.FromHexString(WD_TOKENS.outline);
  scene.meshes.forEach((mesh) => {
    if (!mesh.metadata?.objectId) return;
    mesh.renderOutline = true;
    mesh.outlineColor = color;
    mesh.outlineWidth = 0.012;
  });
}
```

- [ ] **Step 2: Rewire `Scene3D.tsx` engine creation**

Replace the engine/scene/camera creation block in the first `useEffect` (currently `new Engine(...)` … `configureSceneEnvironment` … `engine.runRenderLoop`) with:

```ts
const { engine, scene, camera } = createWarehouseEngine(canvas);
cameraRef.current = camera;
hasFramedSceneRef.current = false;
lastFrameKeyRef.current = "";
```

Remove `shadowRef` and all its usages. Keep the pointer-pick observer, resize observer, `sceneRef`/`engineRef` assignment, `setSceneVersion`, and the cleanup (drop `shadowRef?.dispose()`).

- [ ] **Step 3: Replace shadow sync + selection with outlines + accent**

- Remove the `import { configureSceneEnvironment, syncSceneShadows }` line; import from `engineSetup`: `import { createWarehouseEngine, applyObjectOutlines } from "../engine/engineSetup";`
- In the scene-build `useEffect`, replace `syncSceneShadows(scene, shadowRef.current);` with `applyObjectOutlines(scene);`.
- Update `markSelected` to use the selection accent (thicker outline in selection color) instead of edges, OR keep edges but recolor to `WD_TOKENS.selection`. Concrete (keep edges for crisp selection on the merged mesh):

```ts
import { WD_TOKENS } from "../theme/designTokens";
import { Color3, Color4 } from "@babylonjs/core";

function markSelected(mesh: Mesh) {
  const c = Color3.FromHexString(WD_TOKENS.selection);
  mesh.outlineColor = c;
  mesh.outlineWidth = 0.03;          // emphasised vs the 0.012 default outline
  mesh.renderOutline = true;
}
function clearSelectionStyling(mesh: Mesh) {
  const c = Color3.FromHexString(WD_TOKENS.outline);
  mesh.outlineColor = c;
  mesh.outlineWidth = 0.012;         // back to the default thin outline
}
```

Update `clearAllHighlights` to call `clearSelectionStyling` on meshes with `metadata.objectId` (instead of `disableEdgesRendering`). `highlightById` keeps the same shape (clear all, then `markSelected` on matching meshes).

- [ ] **Step 4: Keep Scene3D under 350 lines**

After edits, run `npm run check:lines`. If `Scene3D.tsx` exceeds 350, move `applyCameraPreset`, `frameScene`, and `screenPointForObject` into a new `components/sceneCameraHelpers.ts` (pure functions taking `{ camera, room, sceneCenter, sceneSize }`) and import them. (These are pure and have no React state — safe to extract.)

- [ ] **Step 5: Verify type-check + build + lines**

Run: `npm --workspace client run lint`
Expected: PASS (shadow refs gone, engineSetup wired).
Run: `npm --workspace client run build`
Expected: PASS (production build).
Run: `npm run check:lines`
Expected: PASS.

- [ ] **Step 6: Commit Tasks 4 + 7 together (green build)**

```bash
git add client/src/modules/warehouse-designer/engine/sceneEnvironment.ts client/src/modules/warehouse-designer/engine/engineSetup.ts client/src/modules/warehouse-designer/components/Scene3D.tsx client/src/modules/warehouse-designer/components/sceneCameraHelpers.ts 2>/dev/null
git commit -m "feat(warehouse): flat lighting, no shadows, adaptive engine budget, thin outlines + accent selection"
```

- [ ] **Step 7: Browser regression — 3D (gating)**

Start the app (dev server or Docker) and in 3D mode confirm, with no console errors:
- Objects render in the flat light palette (off-white canvas, grey structure, thin outlines).
- Click selects an object; selection shows the blue accent outline; clicking empty space deselects.
- The transform gizmo appears on the selected object and moving it updates position; release commits (object stays where dropped).
- Camera presets iso/top/front/side/walk all work; auto-framing works on load.
- Add an object, edit one, delete one — scene updates incrementally without flicker/rebuild.
- Status-coded pallets show muted sage/dusty-blue/clay where applicable.
Any failure here is a blocker — fix before proceeding.

---

## Task 8: 2D floor view repaint

**Files:**
- Modify: `client/src/modules/warehouse-designer/components/PlanView.tsx`
- Modify: `client/src/modules/warehouse-designer/components/planViewHelpers.ts`
- Modify: relevant `client/src/modules/warehouse-designer/styles/chunk-*.css` for the 2D canvas container.

**Interfaces:**
- Consumes: `WD_TOKENS` for canvas fill, grid, structure, outline, status tints.

- [ ] **Step 1: Read the current 2D painter**

Run: open `components/PlanView.tsx` and `components/planViewHelpers.ts`; locate the canvas-drawing code (fills, strokes, grid, status colors). Identify every hardcoded color literal.

- [ ] **Step 2: Replace 2D colors with tokens**

Import `WD_TOKENS` and replace the canvas background, grid lines, structure fills, object outlines, and status fills with the token values so 2D matches 3D exactly:
- Canvas background → `WD_TOKENS.canvas`.
- Grid → `WD_TOKENS.grid` (minor) / `WD_TOKENS.gridStrong` (major).
- Object fill → `WD_TOKENS.structure` / `WD_TOKENS.shelf`; outline stroke → `WD_TOKENS.outline`; selection stroke → `WD_TOKENS.selection`.
- Status fills → `statusFree`/`statusOccupied`/`statusProblem`.
Preserve all drawing geometry, snapping, measurement, and hit-testing logic unchanged — colors only.

- [ ] **Step 3: Verify type-check + lines**

Run: `npm --workspace client run lint` → PASS.
Run: `npm run check:lines` → PASS.

- [ ] **Step 4: Browser regression — 2D (gating)**

In Plan (2D) and Split modes confirm: off-white canvas + faint grid, structure greys, thin outlines, status tints match 3D; wall drawing, snapping, measurement, selection, and the minimap still work. Any failure is a blocker.

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/warehouse-designer/components/PlanView.tsx client/src/modules/warehouse-designer/components/planViewHelpers.ts client/src/modules/warehouse-designer/styles
git commit -m "feat(warehouse): repaint 2D floor view to flat-schematic light tokens"
```

---

## Task 9: Light chrome (panels, toolbars, inspectors)

**Files:**
- Modify: `client/src/modules/warehouse-designer/styles/chunk-*.css` (the chunks styling panels/toolbars/inspectors/status bar/command palette).
- Modify: `client/src/modules/warehouse-designer/App.tsx` (ensure the root element has class `wd-root` so the CSS variables apply and the light theme is scoped).
- Touch components only if a class/wrapper is needed (no behavior changes).

**Interfaces:**
- Consumes: CSS variables from `chunk-23.css` (`--wd-panel`, `--wd-panel-border`, `--wd-text`, `--wd-radius`, etc.).

- [ ] **Step 1: Scope the theme**

In `App.tsx`, ensure the outermost module wrapper element includes `wd-root` (e.g. `<div className="wd-root ...">`). This confines the light variables to the module.

- [ ] **Step 2: Repoint chrome CSS to variables**

Run a search for dark literals used by the warehouse chrome:

Use Grep on `client/src/modules/warehouse-designer/styles` for patterns: dark navy/glass values such as `#0`, `rgba(.*0\.`, `backdrop-filter`, `.glass-panel`, panel background/border/text colors. For each chrome surface (panels, toolbars, docks, inspector, floating inspector, status bar, command palette, layer navigator, mini-map frame, camera-presets), replace:
- panel background → `var(--wd-panel)`
- panel border → `1px solid var(--wd-panel-border)`
- panel radius → `var(--wd-radius)`
- panel shadow → `var(--wd-panel-shadow)`
- primary text → `var(--wd-text)`; muted text → `var(--wd-text-muted)`
- accent/active → `var(--wd-selection)`
Keep spacing/layout; only colors, borders, radius, shadows change. Do not touch CSS outside the warehouse-designer styles folder.

- [ ] **Step 3: Verify type-check + lines + build**

Run: `npm --workspace client run lint` → PASS.
Run: `npm run check:lines` → PASS (CSS files are exempt from the 350 rule only if listed; they are not — keep each chunk < 350 lines; split a chunk into chunk-24.css if needed).
Run: `npm --workspace client run build` → PASS.

- [ ] **Step 4: Browser regression — chrome (gating)**

Confirm panels/toolbars/inspectors/status bar/command palette render as light glass, readable text/contrast, consistent radius/spacing, and that the rest of the app (outside the module) is still dark. All controls still function (open inspector, command palette, layer navigator, level controls, object library, tool dock).

- [ ] **Step 5: Commit**

```bash
git add client/src/modules/warehouse-designer/styles client/src/modules/warehouse-designer/App.tsx
git commit -m "feat(warehouse): light glass chrome scoped to the module via CSS variables"
```

---

## Task 10: Full verification + Docker rebuild

**Files:** none (verification only).

- [ ] **Step 1: Static gates**

Run: `npm run lint` → PASS.
Run: `npm run build` → PASS.
Run: `npm run check:lines` → PASS (no source file > 350 lines).

- [ ] **Step 2: Feature-preservation regression pass (gating)**

In a running app, walk every Preservation Guarantee item in Plan, Split, and 3D modes and confirm identical behavior: view-mode switching; picking; gizmo move + snapping; add/update/remove; all camera presets; 2D drawing/snapping/measurement; every object type (pallet-rack, storage-shelf, column, door, window, no-go-zone, euro-pallet, stair, wall-segment); rack slot designer; levels (manager + quick control + per-level visibility); inventory status linkage + click-through to inventory rows; all panels; keyboard shortcuts; project save/load. Record any behavioral diff as a blocker and fix.

- [ ] **Step 3: Performance sanity**

Load a large layout (many racks); confirm interaction is smooth and adaptive scaling engages on very large scenes (FPS recovers). Compare against the previous build subjectively.

- [ ] **Step 4: Rebuild Docker containers**

Run the project's container rebuild (per user's standing instruction), e.g.:

```bash
docker compose up -d --build
```

Confirm containers come up healthy and the app loads with the new look and no console/request errors.

- [ ] **Step 5: Update PLAN.md and commit**

Update `tool-inventory-system/PLAN.md` with the overhaul summary (files created/changed, what works, how to run, known limitations, line-limit confirmation) per the project's Phase Completion Format.

```bash
git add tool-inventory-system/PLAN.md
git commit -m "docs(warehouse): record flat-schematic light overhaul in PLAN.md"
```

---

## Self-Review

**Spec coverage:**
- Flat-schematic light look → Tasks 1,4,5,6,7,8,9. ✓
- Soft neutral/off-white canvas → Task 1 tokens + Task 4 clearColor + Task 8/9. ✓
- Status color-coding (muted) → Task 1 tokens, Task 5 (rack/pallet), Task 8 (2D). ✓
- Light chrome scoped to module → Task 1 (vars) + Task 9 (`wd-root`). ✓
- Performance: shared materials → Task 2/5/6; merge → Task 3/5; no shadows/fog → Task 4; single-mesh grid → Task 6; adaptive scaling + FXAA + freeze + blockMaterialDirty → Task 7. ✓
- Outlines (thin blueprint) → Task 7 `applyObjectOutlines`; selection accent → Task 7. ✓
- Single token source feeding 3D/2D/chrome → Task 1 (TS + CSS), consumed throughout. ✓
- Preservation Guarantee → transform table (Task 5), gizmo untouched, disposal fix (Task 6), gating regression passes (Tasks 7,8,9,10). ✓
- 350-line rule → engineSetup/sceneCameraHelpers extraction (Task 7), chunk split note (Task 9), check:lines gates. ✓
- Docker rebuild → Task 10. ✓
- No Three.js migration → respected (Babylon throughout). ✓

**Placeholder scan:** No TBD/TODO; code blocks provided for new modules; builder edits specified with exact transforms and concrete material replacements; chrome task is a concrete mechanical literal→variable repoint over a defined file set. ✓

**Type consistency:** `getPalette`/`statusMaterial`/`flatMaterial` (Task 2) used as declared in Tasks 5/6/7. `finalizeMergedObject(scene, root, objectId, world)` signature consistent across Tasks 3/5. `createWarehouseEngine`/`applyObjectOutlines` signatures consistent across Task 7. `configureSceneEnvironment` return type changed to `void` in Task 4 and consumed accordingly in Task 7. ✓
