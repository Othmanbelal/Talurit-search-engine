import { Copy, Move, PackageCheck, Plus, Trash2, Warehouse } from "lucide-react";
import { useMemo, useState } from "react";
import { useStudioStore } from "../store/useStudioStore";
import type { PalletPreset, RackRowConfig, RackRowOrientation, Unit } from "../types";
import { metersToUnit, unitToMeters } from "../utils/units";
import { defaultRackRowConfig, palletPresetDimensions, rackRowSummaries } from "../utils/warehouse";

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
  min = 1,
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
        <input type="number" min={min} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        {suffix ? <em>{suffix}</em> : null}
      </div>
    </label>
  );
}

function clampWhole(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value || min)));
}

export function WarehouseTools() {
  const room = useStudioStore((state) => state.room);
  const objects = useStudioStore((state) => state.objects);
  const settings = useStudioStore((state) => state.settings);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const createRackRows = useStudioStore((state) => state.createRackRows);
  const deleteRackRowGroup = useStudioStore((state) => state.deleteRackRowGroup);
  const duplicateRackRowGroup = useStudioStore((state) => state.duplicateRackRowGroup);
  const moveRackRowGroup = useStudioStore((state) => state.moveRackRowGroup);
  const selectObject = useStudioStore((state) => state.selectObject);

  const groups = useMemo(() => rackRowSummaries(objects), [objects]);
  const [config, setConfig] = useState<RackRowConfig>(() => defaultRackRowConfig(settings, groups.length + 1));

  const requiredAisle = settings.minAisleWidth;
  const previewRackCount = config.rows * config.racksPerRow;
  const footprintWidth = config.orientation === "horizontal"
    ? config.racksPerRow * config.rackWidth + Math.max(0, config.racksPerRow - 1) * config.rackGap
    : config.rows * config.rackDepth + Math.max(0, config.rows - 1) * config.aisleWidth;
  const footprintDepth = config.orientation === "horizontal"
    ? config.rows * config.rackDepth + Math.max(0, config.rows - 1) * config.aisleWidth
    : config.racksPerRow * config.rackWidth + Math.max(0, config.racksPerRow - 1) * config.rackGap;

  const updateConfig = (patch: Partial<RackRowConfig>) => setConfig((current) => ({ ...current, ...patch }));

  const applyPalletPreset = (preset: PalletPreset) => {
    const presetDimensions = palletPresetDimensions(preset);
    const nextPallet = presetDimensions ?? { palletWidth: settings.palletWidth, palletDepth: settings.palletDepth };
    updateSettings({ palletPreset: preset, ...nextPallet });
    updateConfig({
      rackWidth: Math.max(2.7, nextPallet.palletWidth * 2 + 0.25),
      rackDepth: Math.max(1.1, nextPallet.palletDepth + 0.25)
    });
  };

  const handleCreate = () => {
    const safeConfig: RackRowConfig = {
      ...config,
      rowName: config.rowName.trim() || `Rack Row Group ${groups.length + 1}`,
      rows: clampWhole(config.rows, 1, 20),
      racksPerRow: clampWhole(config.racksPerRow, 1, 40),
      rackWidth: Math.max(0.3, config.rackWidth),
      rackDepth: Math.max(0.2, config.rackDepth),
      rackHeight: Math.max(0.5, config.rackHeight),
      rackGap: Math.max(0, config.rackGap),
      aisleWidth: Math.max(0.2, config.aisleWidth),
      levels: clampWhole(config.levels, 1, 12)
    };
    createRackRows(safeConfig);
    setConfig((current) => ({ ...current, rowName: `Rack Row Group ${groups.length + 2}`, startY: current.startY + current.rackDepth + current.aisleWidth }));
  };

  return (
    <section className="warehouse-tools">
      <div className="section-heading">
        <p className="eyebrow">Phase 4 tools</p>
        <h3>Warehouse layout</h3>
      </div>

      <div className="tool-card warehouse-card">
        <div className="warehouse-title">
          <Warehouse size={18} />
          <strong>Pallet + aisle settings</strong>
        </div>
        <div className="field-grid">
          <label className="field full-width">
            <span>Pallet preset</span>
            <select value={settings.palletPreset} onChange={(event) => applyPalletPreset(event.target.value as PalletPreset)}>
              <option value="eur-1200x800">EUR pallet 1200 × 800 mm</option>
              <option value="us-48x40">US pallet 48 × 40 in</option>
              <option value="custom">Custom pallet</option>
            </select>
          </label>
          <NumberField label="Pallet width" value={settings.palletWidth} unit={settings.unit} onChange={(value) => updateSettings({ palletWidth: value, palletPreset: "custom" })} />
          <NumberField label="Pallet depth" value={settings.palletDepth} unit={settings.unit} onChange={(value) => updateSettings({ palletDepth: value, palletPreset: "custom" })} />
          <NumberField label="Minimum aisle" value={settings.minAisleWidth} unit={settings.unit} onChange={(value) => updateSettings({ minAisleWidth: value })} />
          <label className="toggle-field">
            <input checked={settings.showAisleGuides} type="checkbox" onChange={(event) => updateSettings({ showAisleGuides: event.target.checked })} />
            Show aisle guide zones
          </label>
        </div>
        <div className="metric-row">
          <span>Planning aisle</span>
          <strong>{metersToUnit(requiredAisle, settings.unit).toFixed(settings.unit === "m" ? 2 : 0)} {settings.unit}</strong>
        </div>
      </div>

      <div className="tool-card warehouse-card">
        <div className="warehouse-title">
          <Warehouse size={18} />
          <strong>Rack row generator</strong>
        </div>

        <label className="field full-width">
          <span>Group name</span>
          <input value={config.rowName} onChange={(event) => updateConfig({ rowName: event.target.value })} />
        </label>

        <div className="field-grid">
          <PlainNumberField label="Rows" value={config.rows} onChange={(value) => updateConfig({ rows: clampWhole(value, 1, 20) })} />
          <PlainNumberField label="Racks / row" value={config.racksPerRow} onChange={(value) => updateConfig({ racksPerRow: clampWhole(value, 1, 40) })} />
          <label className="field full-width">
            <span>Orientation</span>
            <select value={config.orientation} onChange={(event) => updateConfig({ orientation: event.target.value as RackRowOrientation })}>
              <option value="horizontal">Horizontal rows</option>
              <option value="vertical">Vertical rows</option>
            </select>
          </label>
          <NumberField label="Start X" value={config.startX} unit={settings.unit} onChange={(value) => updateConfig({ startX: value })} />
          <NumberField label="Start Y" value={config.startY} unit={settings.unit} onChange={(value) => updateConfig({ startY: value })} />
          <NumberField label="Rack width" value={config.rackWidth} unit={settings.unit} onChange={(value) => updateConfig({ rackWidth: value })} />
          <NumberField label="Rack depth" value={config.rackDepth} unit={settings.unit} onChange={(value) => updateConfig({ rackDepth: value })} />
          <NumberField label="Rack height" value={config.rackHeight} unit={settings.unit} onChange={(value) => updateConfig({ rackHeight: value })} />
          <NumberField label="Rack gap" value={config.rackGap} unit={settings.unit} onChange={(value) => updateConfig({ rackGap: value })} />
          <NumberField label="Aisle width" value={config.aisleWidth} unit={settings.unit} onChange={(value) => updateConfig({ aisleWidth: value })} />
          <PlainNumberField label="Levels" value={config.levels} onChange={(value) => updateConfig({ levels: clampWhole(value, 1, 12) })} />
          <PlainNumberField label="Load / level" value={config.maxLoadPerLevelKg} suffix="kg" step={50} onChange={(value) => updateConfig({ maxLoadPerLevelKg: Math.max(0, value) })} />
          <label className="field">
            <span>Rack color</span>
            <input type="color" value={config.color} onChange={(event) => updateConfig({ color: event.target.value })} />
          </label>
        </div>

        <div className="generator-preview">
          <span>{previewRackCount} racks</span>
          <span>{footprintWidth.toFixed(2)} m × {footprintDepth.toFixed(2)} m footprint</span>
          <span>{config.aisleWidth >= requiredAisle ? "Aisle OK" : "Aisle warning"}</span>
        </div>

        <button className="primary-action" onClick={handleCreate}>
          <Plus size={16} /> Generate rack rows
        </button>
      </div>

      <div className="tool-card warehouse-card">
        <div className="warehouse-title">
          <PackageCheck size={18} />
          <strong>Generated row groups</strong>
        </div>
        {groups.length === 0 ? (
          <p className="empty-state">No generated rack rows yet.</p>
        ) : (
          <div className="row-group-list">
            {groups.map((group) => (
              <div className="row-group-card" key={group.rowGroupId}>
                <button className="row-group-main" onClick={() => selectObject(group.objects[0]?.id ?? null)}>
                  <strong>{group.rowName}</strong>
                  <small>{group.rackCount} racks · {group.rows} rows · {group.aisleWidth.toFixed(2)} m aisles</small>
                </button>
                <div className="mini-actions">
                  <button title="Move up" onClick={() => moveRackRowGroup(group.rowGroupId, 0, -settings.gridSize)}><Move size={13} /></button>
                  <button title="Move right" onClick={() => moveRackRowGroup(group.rowGroupId, settings.gridSize, 0)}><Move size={13} /></button>
                  <button title="Duplicate group" onClick={() => duplicateRackRowGroup(group.rowGroupId)}><Copy size={13} /></button>
                  <button title="Delete group" className="danger" onClick={() => deleteRackRowGroup(group.rowGroupId)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
