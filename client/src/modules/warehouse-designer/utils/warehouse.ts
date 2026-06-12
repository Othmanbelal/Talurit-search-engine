import type { RackRowConfig, SceneObject, StudioSettings, Vec2 } from "../types";
import { objectCorners, polygonBounds } from "./geometry";

export type RackRowSummary = {
  rowGroupId: string;
  rowName: string;
  rackCount: number;
  rows: number;
  racksPerRow: number;
  aisleWidth: number;
  orientation: "horizontal" | "vertical";
  bounds: ReturnType<typeof polygonBounds>;
  objects: SceneObject[];
};

export type AisleGuide = {
  id: string;
  rowGroupId: string;
  points: Vec2[];
  label: string;
  clearWidth: number;
  requiredWidth: number;
  ok: boolean;
};

export function rackRowSummaries(objects: SceneObject[]): RackRowSummary[] {
  const byGroup = new Map<string, SceneObject[]>();

  objects.forEach((object) => {
    if (!object.row) return;
    const list = byGroup.get(object.row.rowGroupId) ?? [];
    list.push(object);
    byGroup.set(object.row.rowGroupId, list);
  });

  return Array.from(byGroup.entries()).map(([rowGroupId, groupObjects]) => {
    const row = groupObjects[0].row!;
    const allCorners = groupObjects.flatMap((object) => objectCorners(object));
    return {
      rowGroupId,
      rowName: row.rowName,
      rackCount: groupObjects.length,
      rows: row.totalRows,
      racksPerRow: row.racksPerRow,
      aisleWidth: row.aisleWidth,
      orientation: row.orientation,
      bounds: polygonBounds(allCorners),
      objects: groupObjects
    };
  });
}

export function aisleGuidesForRows(objects: SceneObject[], settings: StudioSettings): AisleGuide[] {
  const groups = rackRowSummaries(objects);
  const requiredWidth = settings.minAisleWidth;
  const guides: AisleGuide[] = [];

  groups.forEach((group) => {
    if (group.rows < 2) return;
    const sample = group.objects[0];
    const row = sample.row;
    if (!row) return;

    for (let rowIndex = 0; rowIndex < group.rows - 1; rowIndex++) {
      const current = group.objects.filter((object) => object.row?.rowIndex === rowIndex);
      const next = group.objects.filter((object) => object.row?.rowIndex === rowIndex + 1);
      if (current.length === 0 || next.length === 0) continue;

      const currentBounds = polygonBounds(current.flatMap((object) => objectCorners(object)));
      const nextBounds = polygonBounds(next.flatMap((object) => objectCorners(object)));

      if (group.orientation === "horizontal") {
        const minY = currentBounds.maxY;
        const maxY = nextBounds.minY;
        guides.push({
          id: `${group.rowGroupId}-aisle-${rowIndex}`,
          rowGroupId: group.rowGroupId,
          points: [
            { x: Math.min(currentBounds.minX, nextBounds.minX), y: minY },
            { x: Math.max(currentBounds.maxX, nextBounds.maxX), y: minY },
            { x: Math.max(currentBounds.maxX, nextBounds.maxX), y: maxY },
            { x: Math.min(currentBounds.minX, nextBounds.minX), y: maxY }
          ],
          label: `${group.rowName} aisle ${rowIndex + 1}`,
          clearWidth: Math.max(0, maxY - minY),
          requiredWidth,
          ok: Math.max(0, maxY - minY) >= requiredWidth
        });
      } else {
        const minX = currentBounds.maxX;
        const maxX = nextBounds.minX;
        guides.push({
          id: `${group.rowGroupId}-aisle-${rowIndex}`,
          rowGroupId: group.rowGroupId,
          points: [
            { x: minX, y: Math.min(currentBounds.minY, nextBounds.minY) },
            { x: maxX, y: Math.min(currentBounds.minY, nextBounds.minY) },
            { x: maxX, y: Math.max(currentBounds.maxY, nextBounds.maxY) },
            { x: minX, y: Math.max(currentBounds.maxY, nextBounds.maxY) }
          ],
          label: `${group.rowName} aisle ${rowIndex + 1}`,
          clearWidth: Math.max(0, maxX - minX),
          requiredWidth,
          ok: Math.max(0, maxX - minX) >= requiredWidth
        });
      }
    }
  });

  return guides;
}

export function palletPresetDimensions(preset: StudioSettings["palletPreset"]) {
  if (preset === "eur-1200x800") return { palletWidth: 1.2, palletDepth: 0.8 };
  if (preset === "us-48x40") return { palletWidth: 1.219, palletDepth: 1.016 };
  return null;
}

export function defaultRackRowConfig(settings: StudioSettings, rowNumber: number): RackRowConfig {
  const pallet = palletPresetDimensions(settings.palletPreset) ?? {
    palletWidth: settings.palletWidth,
    palletDepth: settings.palletDepth
  };
  const rackDepth = Math.max(1.1, pallet.palletDepth + 0.25);
  const rackWidth = Math.max(2.7, pallet.palletWidth * 2 + 0.25);
  const aisleWidth = settings.minAisleWidth;

  return {
    rowName: `Rack Row Group ${rowNumber}`,
    rows: 2,
    racksPerRow: 4,
    startX: 1.8,
    startY: 1.8,
    orientation: "horizontal",
    rackWidth,
    rackDepth,
    rackHeight: 4.2,
    levels: 4,
    rackGap: 0.15,
    aisleWidth,
    color: "#d9a441",
    maxLoadPerLevelKg: 800
  };
}
