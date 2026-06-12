import { Copy, Lock, RotateCcw, RotateCw, Trash2, Unlock } from "lucide-react";
import { useMemo } from "react";
import { useStudioStore } from "../store/useStudioStore";
import type { OpeningMeta, RackMeta, SceneObject, Unit } from "../types";
import { metersToUnit, unitToMeters } from "../utils/units";

function NumberField({
  label,
  value,
  unit,
  onChange,
  min = 0,
  step
}: {
  label: string;
  value: number;
  unit: Unit;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-row">
        <input
          type="number"
          min={min}
          step={step ?? (unit === "m" ? 0.05 : 10)}
          value={metersToUnit(value, unit)}
          onChange={(event) => onChange(unitToMeters(Number(event.target.value), unit))}
        />
        <em>{unit}</em>
      </div>
    </label>
  );
}

function PlainNumberField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  suffix
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="field-row">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <em>{suffix}</em> : null}
      </div>
    </label>
  );
}

function objectTitle(object: SceneObject) {
  const type = object.type.replace(/-/g, " ");
  return `${object.name} · ${type}`;
}

export function InspectorPanel() {
  const room = useStudioStore((state) => state.room);
  const settings = useStudioStore((state) => state.settings);
  const objects = useStudioStore((state) => state.objects);
  const selectedId = useStudioStore((state) => state.selectedId);
  const updateRoom = useStudioStore((state) => state.updateRoom);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const updateObject = useStudioStore((state) => state.updateObject);
  const rotateObject = useStudioStore((state) => state.rotateObject);
  const duplicateObject = useStudioStore((state) => state.duplicateObject);
  const deleteObject = useStudioStore((state) => state.deleteObject);

  const selected = useMemo(
    () => objects.find((object) => object.id === selectedId) ?? null,
    [objects, selectedId]
  );

  const updateRack = (rackPatch: Partial<RackMeta>) => {
    if (!selected?.rack) return;
    updateObject(selected.id, { rack: { ...selected.rack, ...rackPatch } });
  };

  const updateOpening = (openingPatch: Partial<OpeningMeta>) => {
    if (!selected?.opening) return;
    updateObject(selected.id, { opening: { ...selected.opening, ...openingPatch } });
  };

  return (
    <div className="inspector">
      <section>
        <div className="section-heading">
          <p className="eyebrow">Room</p>
          <h3>Exact dimensions</h3>
        </div>
        <div className="field-grid">
          <NumberField label="Width" value={room.width} unit={settings.unit} onChange={(value) => updateRoom({ width: value })} />
          <NumberField label="Depth" value={room.depth} unit={settings.unit} onChange={(value) => updateRoom({ depth: value })} />
          <NumberField label="Height" value={room.height} unit={settings.unit} onChange={(value) => updateRoom({ height: value })} />
          <NumberField
            label="Wall thickness"
            value={room.wallThickness}
            unit={settings.unit}
            onChange={(value) => updateRoom({ wallThickness: value })}
          />
        </div>
      </section>

      <section>
        <div className="section-heading">
          <p className="eyebrow">Settings</p>
          <h3>Precision</h3>
        </div>
        <div className="field-grid">
          <label className="field">
            <span>Display unit</span>
            <select value={settings.unit} onChange={(event) => updateSettings({ unit: event.target.value as Unit })}>
              <option value="m">Meters</option>
              <option value="cm">Centimeters</option>
              <option value="mm">Millimeters</option>
            </select>
          </label>
          <NumberField
            label="Grid size"
            value={settings.gridSize}
            unit={settings.unit}
            onChange={(value) => updateSettings({ gridSize: value })}
          />
          <NumberField
            label="Min. aisle width"
            value={settings.minAisleWidth}
            unit={settings.unit}
            onChange={(value) => updateSettings({ minAisleWidth: value })}
          />
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={settings.snapToGrid}
              onChange={(event) => updateSettings({ snapToGrid: event.target.checked })}
            />
            Snap to grid
          </label>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={settings.showRoomVertices}
              onChange={(event) => updateSettings({ showRoomVertices: event.target.checked })}
            />
            Show/edit room vertices
          </label>
        </div>
      </section>

      <section className="selected-section">
        <div className="section-heading">
          <p className="eyebrow">Selected object</p>
          <h3>{selected ? objectTitle(selected) : "Nothing selected"}</h3>
        </div>

        {selected ? (
          <>
            <label className="field full-width">
              <span>Name</span>
              <input value={selected.name} onChange={(event) => updateObject(selected.id, { name: event.target.value })} />
            </label>

            <div className="field-grid">
              <NumberField
                label="X position"
                value={selected.position.x}
                unit={settings.unit}
                onChange={(value) => updateObject(selected.id, { position: { ...selected.position, x: value } })}
              />
              <NumberField
                label="Y position"
                value={selected.position.y}
                unit={settings.unit}
                onChange={(value) => updateObject(selected.id, { position: { ...selected.position, y: value } })}
              />
              <NumberField
                label="Elevation"
                value={selected.elevation ?? 0}
                unit={settings.unit}
                onChange={(value) => updateObject(selected.id, { elevation: Math.max(0, value) })}
              />
              <NumberField label="Width" value={selected.width} unit={settings.unit} onChange={(value) => updateObject(selected.id, { width: value })} />
              <NumberField label={selected.type === "wall-segment" || selected.type === "door" || selected.type === "window" ? "Thickness" : "Depth"} value={selected.depth} unit={settings.unit} onChange={(value) => updateObject(selected.id, { depth: value })} />
              <NumberField label="Height" value={selected.height} unit={settings.unit} onChange={(value) => updateObject(selected.id, { height: value })} />
              <PlainNumberField
                label="Rotation"
                value={Math.round((selected.rotation * 180) / Math.PI)}
                suffix="deg"
                step={5}
                onChange={(value) => updateObject(selected.id, { rotation: (value * Math.PI) / 180 })}
              />
            </div>
            {selected.rack ? (
              <div className="rack-settings">
                <h4>Rack / shelf details</h4>
                <div className="field-grid">
                  <PlainNumberField
                    label="Shelf levels"
                    value={selected.rack.levels}
                    min={1}
                    onChange={(value) => updateRack({ levels: Math.max(1, Math.round(value)) })}
                  />
                  <PlainNumberField
                    label="Max load / shelf"
                    value={selected.rack.maxLoadPerLevelKg}
                    suffix="kg"
                    step={50}
                    onChange={(value) => updateRack({ maxLoadPerLevelKg: value })}
                  />
                  <NumberField
                    label="Column width"
                    value={selected.rack.uprightThickness}
                    unit={settings.unit}
                    onChange={(value) => updateRack({ uprightThickness: value })}
                  />
                  <NumberField
                    label="Beam height"
                    value={selected.rack.beamThickness}
                    unit={settings.unit}
                    onChange={(value) => updateRack({ beamThickness: value })}
                  />
                </div>
              </div>
            ) : null}
            {selected.opening ? (
              <div className="rack-settings">
                <h4>Opening details</h4>
                <div className="field-grid">
                  <NumberField
                    label="Sill height"
                    value={selected.opening.sillHeight}
                    unit={settings.unit}
                    onChange={(value) => updateOpening({ sillHeight: value })}
                  />
                  <label className="field">
                    <span>Swing / type</span>
                    <select
                      value={selected.opening.swingDirection ?? "left"}
                      onChange={(event) => updateOpening({ swingDirection: event.target.value as OpeningMeta["swingDirection"] })}
                    >
                      <option value="left">Left swing</option>
                      <option value="right">Right swing</option>
                      <option value="sliding">Sliding</option>
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            <label className="field full-width">
              <span>Color</span>
              <input type="color" value={selected.color} onChange={(event) => updateObject(selected.id, { color: event.target.value })} />
            </label>

            <div className="button-grid">
              <button onClick={() => rotateObject(selected.id, -Math.PI / 2)} disabled={selected.locked}>
                <RotateCcw size={16} /> Rotate -90°
              </button>
              <button onClick={() => rotateObject(selected.id, Math.PI / 2)} disabled={selected.locked}>
                <RotateCw size={16} /> Rotate +90°
              </button>
              <button onClick={() => duplicateObject(selected.id)}>
                <Copy size={16} /> Duplicate
              </button>
              <button onClick={() => updateObject(selected.id, { locked: !selected.locked })}>
                {selected.locked ? <Unlock size={16} /> : <Lock size={16} />}
                {selected.locked ? "Unlock" : "Lock"}
              </button>
              <button className="danger" onClick={() => deleteObject(selected.id)}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </>
        ) : (
          <p className="empty-state">Select an object in the 2D or 3D view to edit it.</p>
        )}
      </section>
    </div>
  );
}
