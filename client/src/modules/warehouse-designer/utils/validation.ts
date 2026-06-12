import type { Room, SceneObject, StudioSettings, ValidationIssue } from "../types";
import { activeWarehouseBoundary, cornersInsideRoom, distanceBetweenObjects, objectCorners, polygonsOverlap } from "./geometry";
import { aisleGuidesForRows, rackRowSummaries } from "./warehouse";
import { overlappingWallPairs } from "./roomDetection";

function isPhysicalBlocker(object: SceneObject) {
  return object.type !== "no-go-zone" && object.type !== "door" && object.type !== "window";
}

function isWarehouseObject(object: SceneObject) {
  return object.type === "pallet-rack" || object.type === "storage-shelf";
}

export function validateLayout(room: Room, objects: SceneObject[], settings: StudioSettings): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const boundary = activeWarehouseBoundary(room, objects);

  const hasActiveRoomBoundary = boundary.length >= 3;

  for (const object of objects) {
    if (hasActiveRoomBoundary && object.type !== "wall-segment" && object.type !== "door" && object.type !== "window" && !cornersInsideRoom(object, boundary)) {
      issues.push({ id: `${object.id}-outside-room`, objectId: object.id, severity: "error", message: `${object.name} is outside the active room boundary.` });
    }

    if ((object.elevation ?? 0) < 0) {
      issues.push({ id: `${object.id}-below-floor`, objectId: object.id, severity: "error", message: `${object.name} is below the floor level.` });
    }

    if (room.height > 0 && (object.elevation ?? 0) + object.height > room.height) {
      issues.push({ id: `${object.id}-too-tall`, objectId: object.id, severity: "error", message: `${object.name} top is above the ceiling.` });
    }

    if (object.type === "door" && object.width < 0.75) {
      issues.push({ id: `${object.id}-narrow-door`, objectId: object.id, severity: "warning", message: `${object.name} is narrower than a typical accessible door opening.` });
    }

    if (object.type === "pallet-rack" && object.rack && object.rack.maxLoadPerLevelKg > 0) {
      const totalLoad = object.rack.maxLoadPerLevelKg * object.rack.levels;
      if (totalLoad > 6000) {
        issues.push({ id: `${object.id}-high-load-label`, objectId: object.id, severity: "warning", message: `${object.name} is labelled for ${totalLoad.toLocaleString()} kg total. Verify rack tables.` });
      }
    }
  }

  overlappingWallPairs(objects.filter((object) => object.type === "wall-segment")).forEach(([a, b]) => {
    issues.push({ id: `${a.id}-${b.id}-wall-overlap-safe`, objectId: a.id, severity: "warning", message: `Overlapping walls detected between ${a.name} and ${b.name}. Floor generation is paused for that level until fixed.` });
  });

  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i];
      const b = objects[j];
      const overlap = polygonsOverlap(objectCorners(a), objectCorners(b));

      if (overlap && (isPhysicalBlocker(a) || isPhysicalBlocker(b))) {
        const sameGeneratedRow = a.row?.rowGroupId && a.row?.rowGroupId === b.row?.rowGroupId;
        const adjacentRackInSameRow = sameGeneratedRow && a.row?.rowIndex === b.row?.rowIndex;
        if (adjacentRackInSameRow) continue;
        const touchesOpening = a.type === "door" || b.type === "door" || a.type === "window" || b.type === "window";
        const touchesZone = a.type === "no-go-zone" || b.type === "no-go-zone";
        const severity = touchesOpening || touchesZone ? "warning" : "error";
        issues.push({ id: `${a.id}-${b.id}-overlap`, objectId: isPhysicalBlocker(a) ? a.id : b.id, severity, message: severity === "error" ? `${a.name} intersects ${b.name}.` : `${a.name} conflicts with ${b.name}; check opening or restricted clearance.` });
      }

      const bothWarehouseObjects = isWarehouseObject(a) && isWarehouseObject(b);
      const generatedSameGroup = a.row?.rowGroupId && a.row?.rowGroupId === b.row?.rowGroupId;
      const clearance = distanceBetweenObjects(a, b);

      if (!overlap && bothWarehouseObjects && !generatedSameGroup && clearance < settings.minAisleWidth) {
        issues.push({ id: `${a.id}-${b.id}-clearance`, objectId: a.id, severity: "warning", message: `${a.name} and ${b.name} have less than the minimum aisle clearance.` });
      }
    }
  }

  rackRowSummaries(objects).forEach((summary) => {
    if (summary.aisleWidth < settings.minAisleWidth) {
      issues.push({ id: `${summary.rowGroupId}-planned-aisle-narrow`, objectId: summary.objects[0]?.id, severity: "warning", message: `${summary.rowName} was generated with aisles below the current minimum clearance.` });
    }
  });

  aisleGuidesForRows(objects, settings).forEach((guide) => {
    if (!guide.ok) {
      issues.push({ id: `${guide.id}-too-narrow`, severity: "warning", message: `${guide.label} has ${guide.clearWidth.toFixed(2)} m clear width; required ${guide.requiredWidth.toFixed(2)} m.` });
    }
  });

  if (issues.length === 0) {
    issues.push({ id: "layout-ok", severity: "info", message: "Layout is valid: no collisions or ceiling errors detected." });
  }

  return issues;
}
