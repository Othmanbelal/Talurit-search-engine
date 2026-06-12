import type { ValidationIssue } from "../types";
import { useStudioStore } from "../store/useStudioStore";
import { objectCorners, polygonBounds, roomBoundary } from "../utils/geometry";

function points(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function MiniMap({ issues }: { issues: ValidationIssue[] }) {
  const room = useStudioStore((state) => state.room);
  const objects = useStudioStore((state) => state.objects);
  const selectedId = useStudioStore((state) => state.selectedId);
  const selectObject = useStudioStore((state) => state.selectObject);
  const boundary = roomBoundary(room);
  const bounds = polygonBounds(boundary);
  const pad = Math.max(room.width, room.depth) * 0.08;
  const viewBox = `${bounds.minX - pad} ${bounds.minY - pad} ${bounds.maxX - bounds.minX + pad * 2} ${bounds.maxY - bounds.minY + pad * 2}`;

  return (
    <section className="mini-map glass-panel" aria-label="Warehouse overview mini map">
      <div className="mini-map-header">
        <span>Overview</span>
        <small>{objects.length} objects</small>
      </div>
      <svg viewBox={viewBox}>
        <polygon points={points(boundary)} className="mini-room" />
        {objects.map((object) => {
          const hasIssue = issues.some((issue) => issue.objectId === object.id && issue.severity !== "info");
          return (
            <polygon
              key={object.id}
              points={points(objectCorners(object))}
              className={["mini-object", selectedId === object.id ? "selected" : "", hasIssue ? "has-issue" : ""].join(" ")}
              onClick={() => selectObject(object.id)}
            />
          );
        })}
      </svg>
      <p>Click a shape to select it.</p>
    </section>
  );
}
