import type { SceneObject } from "../types";
import type { InitialStudioState } from "./studioTypes";
import { defaultMeta, defaultSettings } from "./defaults";
import { buildRackRowObjects, createDefaultRackMeta } from "./objectFactory";

export function buildTemplateProject(templateId: string): InitialStudioState | null {
  const baseSettings = { ...defaultSettings };
  const makeRack = (id: string, name: string, x: number, y: number, rotation = 0, color = "#d9a441"): SceneObject => ({
    id,
    name,
    type: "pallet-rack",
    position: { x, y },
    rotation,
    width: 2.7,
    depth: 1.1,
    height: 4.2,
    color,
    locked: false,
    rack: createDefaultRackMeta(4, 850)
  });
  const makeShelf = (id: string, name: string, x: number, y: number, rotation = 0): SceneObject => ({
    id,
    name,
    type: "storage-shelf",
    position: { x, y },
    rotation,
    width: 1.6,
    depth: 0.55,
    height: 2.1,
    color: "#42d9ff",
    locked: false,
    rack: { levels: 5, uprightThickness: 0.035, beamThickness: 0.04, shelfBoardThickness: 0.035, maxLoadPerLevelKg: 140 }
  });

  if (templateId === "compact-stockroom") {
    const objects = [
      makeShelf("tpl-shelf-1", "Wall Shelf A", 1.4, 1.2, 0),
      makeShelf("tpl-shelf-2", "Wall Shelf B", 1.4, 2.7, 0),
      makeShelf("tpl-shelf-3", "Packing Shelf", 4.6, 2.8, Math.PI / 2),
      { id: "tpl-door-1", name: "Main Door", type: "door", position: { x: 3, y: 0.08 }, rotation: 0, width: 1.1, depth: 0.14, height: 2.1, color: "#65e6a5", locked: false, opening: { sillHeight: 0, swingDirection: "sliding" } } as SceneObject
    ];
    return { projectName: "Compact Stockroom", projectMeta: { ...defaultMeta, notes: "Template: compact stockroom with wall shelves and a small packing zone." }, room: { width: 7, depth: 5, height: 3.2, wallThickness: 0.12 }, objects, settings: { ...baseSettings, gridSize: 0.1, minAisleWidth: 0.9, visualTheme: "arctic-graphite" }, selectedId: objects[0].id, selectedIds: [], activeTool: "select", draftWallStart: null, spaceNames: {} };
  }

  if (templateId === "pallet-warehouse") {
    const first = buildRackRowObjects({ rowName: "Inbound Rack", rows: 2, racksPerRow: 4, startX: 2, startY: 2, orientation: "horizontal", rackWidth: 2.7, rackDepth: 1.1, rackHeight: 4.8, levels: 5, rackGap: 0.18, aisleWidth: 3.2, color: "#d6a94a", maxLoadPerLevelKg: 1000 }, 0).objects;
    const objects = [
      ...first,
      { id: "tpl-zone-1", name: "Loading / Staging Zone", type: "no-go-zone", position: { x: 5.2, y: 9.2 }, rotation: 0, width: 6.2, depth: 1.4, height: 0.05, color: "#ffb84a", locked: false } as SceneObject,
      { id: "tpl-column-1", name: "Structural Column", type: "column", position: { x: 10.6, y: 5.5 }, rotation: 0, width: 0.45, depth: 0.45, height: 6, color: "#9aa4b2", locked: false } as SceneObject
    ];
    return { projectName: "Pallet Warehouse Concept", projectMeta: { ...defaultMeta, notes: "Template: pallet rack warehouse with staging zone and clearance aisles." }, room: { width: 15, depth: 11, height: 6, wallThickness: 0.16 }, objects, settings: { ...baseSettings, minAisleWidth: 3.0, visualTheme: "midnight-gold", ambienceLevel: "technical" }, selectedId: objects[0].id, selectedIds: [], activeTool: "select", draftWallStart: null, spaceNames: {} };
  }

  if (templateId === "customer-showroom") {
    const objects = [
      makeRack("tpl-rack-hero", "Display Rack", 2.2, 2.2, 0, "#d6a94a"),
      makeShelf("tpl-shelf-demo", "Demo Shelf", 6.2, 2.2, 0),
      { id: "tpl-zone-demo", name: "Presentation Area", type: "no-go-zone", position: { x: 4.2, y: 5.2 }, rotation: 0, width: 4.5, depth: 2.1, height: 0.05, color: "#42d9ff", locked: false } as SceneObject
    ];
    return { projectName: "Customer Showroom Layout", projectMeta: { ...defaultMeta, notes: "Template: clean customer-facing layout for presentation mode." }, room: { width: 9, depth: 7, height: 4, wallThickness: 0.12 }, objects, settings: { ...baseSettings, visualTheme: "light-presentation", ambienceLevel: "presentation", showAisleGuides: false }, selectedId: objects[0].id, selectedIds: [], activeTool: "select", draftWallStart: null, spaceNames: {} };
  }

  return null;
}
