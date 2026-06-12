import { PointerEvent, useState } from "react";
import { GripHorizontal, Minimize2, X } from "lucide-react";
import { InspectorPanel } from "./InspectorPanel";
import { useStudioStore } from "../store/useStudioStore";

type FloatingInspectorProps = {
  open: boolean;
  onClose: () => void;
};

export function FloatingInspector({ open, onClose }: FloatingInspectorProps) {
  const selected = useStudioStore((state) => state.selectedObject());
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 96, y: 88 });
  const [drag, setDrag] = useState<{ pointerId: number; dx: number; dy: number } | null>(null);

  if (!open || !selected) return null;

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setDrag({ pointerId: event.pointerId, dx: event.clientX - position.x, dy: event.clientY - position.y });
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = Math.max(16, Math.min(window.innerWidth - 420, event.clientX - drag.dx));
    const nextY = Math.max(70, Math.min(window.innerHeight - 160, event.clientY - drag.dy));
    setPosition({ x: nextX, y: nextY });
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag?.pointerId === event.pointerId) setDrag(null);
  };

  return (
    <aside className={collapsed ? "floating-inspector glass-panel collapsed" : "floating-inspector glass-panel"} style={{ left: position.x, top: position.y }}>
      <div className="floating-inspector-handle" onPointerDown={beginDrag} onPointerMove={move} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <GripHorizontal size={16} />
        <div>
          <p className="eyebrow">Floating precision editor</p>
          <h2>{selected.name}</h2>
        </div>
        <button onPointerDown={(event) => event.stopPropagation()} onClick={() => setCollapsed((value) => !value)} aria-label="Collapse inspector">
          <Minimize2 size={15} />
        </button>
        <button onPointerDown={(event) => event.stopPropagation()} onClick={onClose} aria-label="Close inspector">
          <X size={15} />
        </button>
      </div>

      {!collapsed ? (
        <div className="floating-inspector-body">
          <InspectorPanel />
        </div>
      ) : null}
    </aside>
  );
}
