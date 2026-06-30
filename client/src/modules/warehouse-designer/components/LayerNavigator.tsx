import { Copy, Eye, Home, Layers, Lock, Trash2, Unlock, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { SceneObject } from "../types";
import { useStudioStore } from "../store/useStudioStore";
import { detectRoomLoops } from "../utils/roomDetection";
import { formatLength } from "../utils/units";

function typeLabel(type: SceneObject["type"]) {
  return type.replace(/-/g, " ");
}

export function LayerNavigator({ open, onClose, embedded = false }: { open: boolean; onClose: () => void; embedded?: boolean }) {
  const { t } = useTranslation("warehouses");
  const [query, setQuery] = useState("");
  const objects = useStudioStore((state) => state.objects);
  const spaceNames = useStudioStore((state) => state.spaceNames);
  const selectedId = useStudioStore((state) => state.selectedId);
  const settings = useStudioStore((state) => state.settings);
  const selectObject = useStudioStore((state) => state.selectObject);
  const updateObject = useStudioStore((state) => state.updateObject);
  const updateSpaceName = useStudioStore((state) => state.updateSpaceName);
  const deleteObject = useStudioStore((state) => state.deleteObject);
  const duplicateObject = useStudioStore((state) => state.duplicateObject);
  const deleteRackRowGroup = useStudioStore((state) => state.deleteRackRowGroup);
  const duplicateRackRowGroup = useStudioStore((state) => state.duplicateRackRowGroup);

  const spaces = useMemo(() => detectRoomLoops(objects, spaceNames), [objects, spaceNames]);
  const spaceWallIds = useMemo(() => new Set(spaces.flatMap((space) => space.wallIds)), [spaces]);
  const spacesByLevel = useMemo(() => {
    const map = new Map<string, typeof spaces>();
    spaces.forEach((space) => map.set(space.levelName, [...(map.get(space.levelName) ?? []), space]));
    return [...map.entries()];
  }, [spaces]);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; objects: SceneObject[] }>();
    objects.forEach((object) => {
      if (!object.row) return;
      const current = map.get(object.row.rowGroupId) ?? { name: object.row.rowName, objects: [] };
      current.objects.push(object);
      map.set(object.row.rowGroupId, current);
    });
    return Array.from(map.entries());
  }, [objects]);

  const singles = objects.filter((object) => !object.row && !spaceWallIds.has(object.id));
  const filteredSingles = singles.filter((object) => `${object.name} ${object.type}`.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;

  return (
    <aside className={embedded ? "layer-navigator embedded-layer-panel" : "layer-navigator glass-panel"}>
      <header>
        <div><p className="eyebrow">{t("designer.layers")}</p><h3>{t("designer.objects")}</h3></div>
        {embedded ? null : <button onClick={onClose} aria-label="Close layer navigator"><X size={15} /></button>}
      </header>

      <label className="layer-search">
        <span>{t("designer.layerNavigator.search")}</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("designer.layerNavigator.searchPlaceholder")} />
      </label>

      <div className="layer-section">
        <h4><Home size={14} /> {t("designer.layerNavigator.detectedSpaces")}</h4>
        {spaces.length === 0 ? <p className="empty-layer-note">Draw connected walls to create a warehouse or room.</p> : null}
        {spacesByLevel.map(([levelName, levelSpaces]) => (
          <div key={levelName} className="layer-level-group">
            <p>{levelName}</p>
            {levelSpaces.map((space) => (
              <div key={space.id} className="layer-space-card">
                <div>
                  <strong>{space.type === "warehouse" ? "Floor plate" : "Internal room"}</strong>
                  <span>{space.area.toFixed(1)} m² · {space.wallIds.length} walls · slab {formatLength(space.floorThickness, settings.unit, 2)}</span>
                </div>
                <input value={space.name} onChange={(event) => updateSpaceName(space.id, event.target.value)} aria-label={`Rename ${space.name}`} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="layer-section">
        <h4><Layers size={14} /> Rack-row groups</h4>
        {groups.length === 0 ? <p className="empty-layer-note">No generated groups yet.</p> : null}
        {groups.map(([groupId, group]) => (
          <div key={groupId} className="layer-group-card">
            <button className="layer-group-title" onClick={() => selectObject(group.objects[0]?.id ?? null)}>
              <strong>{group.name}</strong><span>{group.objects.length} racks</span>
            </button>
            <div className="layer-group-actions">
              <button onClick={() => duplicateRackRowGroup(groupId)}><Copy size={13} /> Copy group</button>
              <button className="danger" onClick={() => deleteRackRowGroup(groupId)}><Trash2 size={13} /> Delete group</button>
            </div>
          </div>
        ))}
      </div>

      <div className="layer-section object-list-section">
        <h4><Eye size={14} /> Single objects</h4>
        {filteredSingles.map((object) => {
          return (
            <div key={object.id} className={object.id === selectedId ? "layer-object active" : "layer-object"}>
              <button onClick={() => selectObject(object.id)}><strong>{object.name}</strong><span>{typeLabel(object.type)} · Z {formatLength(object.elevation ?? 0, settings.unit, 1)}</span></button>
              <button title="Lock/unlock" onClick={() => updateObject(object.id, { locked: !object.locked })}>{object.locked ? <Unlock size={13} /> : <Lock size={13} />}</button>
              <button title="Duplicate" onClick={() => duplicateObject(object.id)}><Copy size={13} /></button>
              <button title="Delete" className="danger" onClick={() => deleteObject(object.id)}><Trash2 size={13} /></button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
