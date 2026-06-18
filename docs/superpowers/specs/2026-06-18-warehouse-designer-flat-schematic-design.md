# Warehouse Designer — Flat-Schematic Light Overhaul

**Date:** 2026-06-18
**Module:** `client/src/modules/warehouse-designer`
**Status:** Design approved, pending spec review

## Problem

The previous "industrial dark" overhaul of the warehouse designer was rejected on
two counts:

1. **Aesthetics** — the dark industrial look (Plan, Split, 3D) does not read as
   premium/professional to the user.
2. **Performance** — low FPS, especially as object count grows.

The user wants the whole warehouse designer reworked "from its roots up to the
visuals": a single, consistent, premium *light* product, and FPS fixed at the
architectural level rather than patched.

## Root-Cause Analysis (performance)

The low FPS is **not** an engine (Babylon.js) limitation. It is caused by how the
scene is constructed:

1. **Per-part unique PBR materials.** `createRackMesh` builds 5 fresh
   `PBRMaterial` instances per rack (`-uprights`, `-beams`, `-shelves`, `-braces`,
   `-feet`) in `engine/rackMeshes.ts`. 50 racks ⇒ ~250 unique heavy shaders. No
   material sharing ⇒ batching is impossible.
2. **No instancing / no merging.** Each rack is ~26–30 separate
   `MeshBuilder.CreateBox` meshes, each its own draw call. ~50 racks ⇒ ~1,400 draw
   calls for racks alone.
3. **Heavy shadows.** Blur-Exponential shadow map at 2048 with `blurKernel = 28`
   in `engine/sceneEnvironment.ts`, plus `receiveShadows = true` re-applied to
   every visible mesh and the shadow render-list rebuilt on each scene change.
4. **No adaptive resolution.** Engine runs at full device-pixel-ratio with MSAA
   (`antialias: true`) and no `setHardwareScalingLevel` fallback.

A Three.js migration was considered and **rejected**: the bottleneck is
architectural, so a port would carry the same problems unless rebuilt the same
way, while throwing away working picking, the incremental mesh cache/diff, the
transform gizmo, camera, and post-process wiring — high risk, no guaranteed gain.

## Decisions (locked with user)

| Topic | Decision |
|---|---|
| Visual direction | **Flat schematic 3D** — stylized, flat clean colors, thin outlines, minimal lighting, no heavy shadows |
| Scope | **Everything** — 3D scene + 2D floor view + UI chrome of the warehouse designer module |
| Canvas tone | **Off-white / light-grey**, soft and subtle |
| Object color | **Status color-coding in muted desaturated tints** (sage = free, dusty blue = occupied, soft clay = problem); structure in soft greys |
| Chrome palette | **Light chrome too** — the whole module becomes a soft, bright, light product |
| Engine | **Stay on Babylon.js**; fix at the roots (no Three.js migration) |
| App-wide theme | Light theme is **scoped to the warehouse-designer module only**; the rest of the inventory app keeps its dark-navy identity (deliberate, contained departure from the CLAUDE.md dark-navy UI rule) |

## Preservation Guarantee (controlling constraint)

**This is a visual + performance overhaul ONLY. Every existing functionality and
feature of the warehouse designer must be preserved with identical behavior.** No
feature is removed, simplified, or altered in behavior to make the visuals or FPS
work. If any proposed change would change behavior, the visual/perf approach is
adjusted instead — preservation wins.

Features that MUST keep working exactly as today (non-exhaustive — anything
currently working is in scope for preservation, not just this list):

- **View modes:** Plan (2D), Split, and 3D modes, and switching between them.
- **Selection & picking:** click-to-select objects in 3D and 2D; selection state.
- **Transform gizmo:** move/rotate (`useSceneTransformGizmo`) with the same
  precision and snapping.
- **Object lifecycle:** add, update, remove objects with the existing incremental
  (O(delta)) scene diff; no full rebuilds reintroduced.
- **Camera:** all presets (iso, top, front, side, walk), framing/auto-fit,
  pan/zoom/orbit, inertia behavior.
- **2D drawing tools:** wall drawing, room tools, snapping, measurement, aisle
  guides, plan symbols.
- **Object types:** racks, storage shelves, columns, doors/windows (openings),
  no-go zones, euro pallets, stairs, wall segments — all still render and behave.
- **Rack/slot features:** rack levels, shelves-per-level, the rack slot designer
  workflow, generated shelves/slots, FACK/compartment handling.
- **Levels:** level manager, level quick control, per-level visibility.
- **Inventory linkage:** status-driven pallet/slot rendering, occupied/free/problem
  state derived from real assignments; click-through to inventory rows.
- **Panels & UX:** object library, inspector/floating inspector, tool dock, studio
  drawer, command palette, minimap, layer navigator, smart status bar, smart
  suggestions, issue panel, selection chip, keyboard shortcuts.
- **Persistence:** project save/load to the database (no regression to storage).

The redesign changes **materials, lighting, geometry batching, outlines, canvas
styling, and CSS** — not the data model, the store actions, the interaction
handlers, or the feature surface.

## Goals / Success Criteria

- The 3D scene, 2D floor view, and surrounding chrome share one consistent
  flat-schematic light language and the **same** color tokens.
- Status (free / occupied / problem) is conveyed in muted tints in both 2D and 3D.
- FPS is dramatically improved on large layouts: target a smooth interactive
  framerate (≈60fps on a typical layout; adaptive scaling keeps it interactive on
  very large scenes).
- No regressions in: object picking/selection, the transform gizmo, the
  incremental add/update/remove of objects, camera presets, 2D⇄3D parity.
- No source file exceeds 350 lines (project hard rule).
- Docker containers rebuilt after the patch; verified by lint + production build +
  browser check in 2D and 3D.

## Non-Goals (YAGNI)

- No change to the rest of the inventory app's theme.
- No change to warehouse data model, persistence, or inventory/slot business logic.
- No photorealism, no PBR textures, no real-time shadows, no reflections.
- No Three.js / react-three-fiber migration.

## Architecture

### Shared design tokens (new source of truth)

A single source of truth feeds all three layers so they can never drift again:

- `styles/designTokens.ts` — exported TS constants: canvas color, grid color,
  structure greys, the three muted status tints, outline color, selection accent,
  spacing/radius scale. Kept well under 350 lines (values + small helpers only).
- A matching CSS-variable block (`:root`-scoped to the module wrapper) for the
  chrome and 2D view. The TS tokens and the CSS variables are kept in sync from
  the same canonical values (single object exported, CSS vars generated/declared
  from the same names).

The 3D engine reads the TS tokens; the 2D canvas and chrome read the CSS
variables (and, where it draws on canvas, the TS tokens).

### 3D scene (Babylon) — flat schematic + Approach A performance

Files: `engine/sceneEnvironment.ts`, `engine/babylonCore.ts`,
`engine/rackMeshes.ts`, `engine/objectMeshes.ts`, `engine/roomMeshes.ts`,
`engine/objectMeshCache.ts`, `components/Scene3D.tsx`, plus new helpers below.

1. **Shared flat material palette** — new `engine/materialPalette.ts`:
   - Build a small fixed set of **shared, frozen `StandardMaterial`s** once per
     scene, keyed by role: `structure` (soft grey), `structureAlt`, `outline`,
     `floor`, and the three status tints `statusFree` / `statusOccupied` /
     `statusProblem`, plus `selection`.
   - Flat appearance: rely on `diffuseColor` + a small `emissiveColor` floor so
     unlit faces are not black; `specularColor` near zero; `material.freeze()`.
   - Replace **all** `makeMaterial` / per-part PBR usage in `rackMeshes.ts`,
     `objectMeshes.ts`, `roomMeshes.ts` with palette lookups. No per-object
     material allocation.
   - `babylonCore.ts`'s `makeMaterial`/`makeTransparentMaterial` are reworked to
     return shared/flat materials (or are replaced by palette accessors).

2. **Merge each object into one mesh** — new `engine/meshMerge.ts` helper used by
   the object builders:
   - Each builder (rack, shelf, column, opening, pallet, stair, no-go-zone)
     constructs its boxes, then merges them per *material* into as few meshes as
     possible (ideally one or two) via `Mesh.MergeMeshes`, preserving
     `metadata.objectId` on the merged result so picking still resolves to the
     object. Status-colored sub-parts (e.g. a pallet's status block) merge into
     their status-material group.
   - Structural meshes call `freezeWorldMatrix()`; non-interactive sub-parts are
     marked `isPickable = false` where a single pickable hull suffices.
   - The incremental cache (`objectMeshCache.ts`) keeps working at the
     **per-object** granularity (one merged node per object), so the existing
     add/update/remove diff in `Scene3D.tsx` is unchanged in shape.

3. **Lighting & environment** — `sceneEnvironment.ts` rewritten for flat light:
   - Soft off-white/light-grey `clearColor`; **remove** fog; remove ACES heavy
     tonemapping/contrast (or set to neutral) so colors stay flat and true.
   - One soft `HemisphericLight` for gentle face differentiation; **no**
     directional sun, **no** `ShadowGenerator`. `syncSceneShadows` is removed or
     reduced to a no-op/cleanup.
   - Light ground plane in the canvas color + a faint blueprint grid
     (`GridMaterial` or a cheap line grid), reading grid color from tokens.

4. **Outline (blueprint edge)** — new `engine/outline.ts`:
   - A **single screen-space outline post-process** (edge detection on the
     rendered scene) so outline cost is constant regardless of object count —
     replacing per-mesh `enableEdgesRendering`.
   - Selection is a distinct accent outline (e.g. Babylon `HighlightLayer` or a
     selection color in the outline pass) applied only to the selected object —
     replacing the current per-child `enableEdgesRendering` in `Scene3D.tsx`.

5. **Engine / render budget** — `Scene3D.tsx`:
   - Cap device-pixel-ratio and add **adaptive `setHardwareScalingLevel`** toward
     a 60fps target; prefer **FXAA** over MSAA.
   - `scene.blockMaterialDirtyMechanism = true` after setup;
     `scene.skipPointerMovePicking = true`; freeze active meshes when the scene is
     static and unfreeze on edit. Keep the render loop, picking, gizmo, and camera
     presets intact.

### 2D floor view

Files: `components/PlanView.tsx`, `components/planViewHelpers.ts`, relevant
`styles/chunk-*.css`.

- Repaint to the flat-schematic light language: off-white/light-grey canvas,
  faint blueprint grid, thin darker outlines, structure in soft greys.
- Use the **same** status tints as 3D (from tokens) so 2D and 3D read identically.
- No behavioral change to drawing/snapping/measurement logic — visual only.

### UI chrome

Files: toolbars/docks/inspectors/status bar components and their `styles/chunk-*`
CSS (`TopBar`, `ToolDock`, `StudioDrawer`, `InspectorPanel`, `FloatingInspector`,
`SmartStatusBar`, `CommandPalette`, `LayerNavigator`, panels, etc.).

- Convert the module's chrome to **light glass**: off-white translucent panels,
  soft grey borders, generous consistent spacing, consistent corner radius — all
  driven by the shared CSS variables.
- Scope the light theme to the warehouse-designer module wrapper so it does not
  leak into the rest of the (dark) app.

## Component / File Plan (new + changed)

New:
- `styles/designTokens.ts` — canonical color/spacing tokens (TS).
- module-scoped CSS variable block (in an existing or new small CSS chunk).
- `engine/materialPalette.ts` — shared frozen flat materials.
- `engine/meshMerge.ts` — per-object merge helper.
- `engine/outline.ts` — screen-space outline + selection accent.

Changed:
- `engine/sceneEnvironment.ts` — flat lighting, remove shadows/fog, grid.
- `engine/babylonCore.ts` — palette-based materials.
- `engine/rackMeshes.ts`, `engine/objectMeshes.ts`, `engine/roomMeshes.ts` —
  palette + merge.
- `engine/objectMeshCache.ts` — adapt to merged nodes if needed.
- `components/Scene3D.tsx` — engine budget, outline/selection, remove
  per-child edge highlight, remove shadow wiring.
- `components/PlanView.tsx`, `components/planViewHelpers.ts` — 2D repaint.
- Chrome components + `styles/chunk-*.css` — light theme via tokens.

All new/changed source files stay under 350 lines; split helpers out as needed.

## Data Flow

- Tokens (TS + CSS vars) → consumed by engine (3D), canvas painter (2D), and CSS
  (chrome). One change to a token updates all three layers.
- Store (`useStudioStore`) → `Scene3D` incremental diff → per-object merged nodes
  with shared materials → outline post-process → render.
- Inventory status per object → status material selection (3D) and status fill
  (2D), from the same token values.

## Error Handling / Edge Cases

- **Very large scenes:** adaptive hardware scaling degrades resolution before
  framerate; merging + shared materials keep draw calls bounded.
- **Empty scene / no objects:** grid + canvas render; camera framing still works.
- **Picking after merge:** merged mesh carries `metadata.objectId`; verify
  click→select and gizmo attach still resolve correctly.
- **Selection outline:** must apply only to selected object and clear cleanly on
  deselect.
- **Engine restart (scene re-create):** existing stale-ref handling in
  `Scene3D.tsx` must continue to clear caches without disposing stale nodes.

## Testing / Verification

- `npm run check:lines` — no source file > 350 lines.
- Client lint passes.
- Production build passes.
- **Feature-preservation regression pass (gating):** walk through every item in
  the Preservation Guarantee in the browser and confirm identical behavior —
  view-mode switching, picking, gizmo move/rotate + snapping, add/update/remove,
  all camera presets, 2D drawing/snapping/measurement, every object type, rack
  slot designer, levels, inventory status linkage + click-through, all panels,
  keyboard shortcuts, and save/load. Any behavioral difference is a blocker.
- Browser check in 2D and 3D: status tints correct, 2D⇄3D visual parity, no
  console/request errors.
- Manual FPS sanity check on a large layout (subjectively smooth; adaptive scaling
  engages on very large scenes).
- Docker containers rebuilt after the patch.

## Rollout

Single feature branch; phased implementation (tokens → 3D engine/perf →
2D view → chrome), verifying after each phase. Rebuild Docker and run the full
verification before claiming completion.
