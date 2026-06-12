import { Check, Plus, Trash2, X } from "lucide-react";
import { Modal } from "../Modal";
import { useEffect, useState } from "react";
import type { ColumnSettingsInput, CustomColumn, StructuredInventoryTable } from "../../types/structured-inventory";
import { attributeColumnKey, availableColumns, defaultStockColumns, type StockColumnKey } from "./StructuredStockRowsTable";

export function TableColumnSettingsPanel({
  onClose,
  onSave,
  table,
}: {
  onClose: () => void;
  onSave: (settings: ColumnSettingsInput) => Promise<void>;
  table: StructuredInventoryTable | null;
}) {
  const initial = settingsFromTable(table);
  const [selected, setSelected] = useState<string[]>(initial);
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>(table?.columnSettings.customColumns ?? []);
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>(table?.columnSettings.columnLabels ?? {});
  const [widgets, setWidgets] = useState(table?.columnSettings.widgets ?? { itemCount: true, balance: true });
  const [allowedSearchAttributes, setAllowedSearchAttributes] = useState<string[] | null>(table?.columnSettings.allowedSearchAttributes ?? null);
  const [newColumn, setNewColumn] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelected(settingsFromTable(table));
    setCustomColumns(table?.columnSettings.customColumns ?? []);
    setColumnLabels(table?.columnSettings.columnLabels ?? {});
    setWidgets(table?.columnSettings.widgets ?? { itemCount: true, balance: true });
    setAllowedSearchAttributes(table?.columnSettings.allowedSearchAttributes ?? null);
  }, [table]);

  async function save() {
    await onSave({ visibleColumns: selected, customColumns, columnLabels: cleanLabels(columnLabels), widgets, allowedSearchAttributes });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function toggle(key: StockColumnKey) {
    setSelected((c) => c.includes(key) ? c.filter((k) => k !== key) : [...c, key]);
  }

  function renameColumn(key: string, label: string) {
    setColumnLabels((c) => ({ ...c, [key]: label }));
    setCustomColumns((c) => c.map((col) => col.key === key ? { ...col, label } : col));
  }

  function removeColumn(key: string) {
    const isCustom = customColumns.some((c) => c.key === key);
    const msg = isCustom ? "Delete this custom column and its values?" : "Hide this built-in column?";
    if (!window.confirm(msg)) return;
    if (!isCustom) return setSelected((c) => c.filter((k) => k !== key));
    setCustomColumns((c) => c.filter((col) => col.key !== key));
    setSelected((c) => c.filter((k) => k !== key));
    setColumnLabels((c) => { const next = { ...c }; delete next[key]; return next; });
  }

  function addCustomColumn() {
    const name = newColumn.trim();
    if (!name) return;
    const col = { key: attributeColumnKey(name), name, label: name };
    if (!customColumns.some((c) => c.key === col.key)) setCustomColumns((c) => [...c, col]);
    setColumnLabels((c) => ({ ...c, [col.key]: c[col.key] ?? name }));
    setSelected((c) => c.includes(col.key) ? c : [...c, col.key]);
    setNewColumn("");
  }

  const columns = availableColumns({ visibleColumns: selected, customColumns, columnLabels, widgets });

  return (
    <Modal maxWidth="max-w-3xl" onClose={onClose}>
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Configure</p>
          <h2 className="mt-0.5 text-lg font-semibold text-white">Table layout</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition-all"
            onClick={save}
            type="button"
          >
            {saved ? <><Check size={14} /> Saved</> : "Save"}
          </button>
          <button
            className="rounded-md border border-line p-2 text-slate-400 hover:border-slate-500 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Columns section */}
        <section className="px-6 py-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Columns</h3>
            <span className="text-xs text-slate-600">{selected.length} visible</span>
          </div>
          <p className="mb-4 text-xs text-slate-600">Toggle visibility · click label to rename</p>
          <div className="divide-y divide-line/50">
            {columns.map((col) => {
              const isCustom = customColumns.some((c) => c.key === col.key);
              const isVisible = selected.includes(col.key);
              return (
                <div
                  key={col.key}
                  className={`group flex items-center gap-3 py-2.5 transition-colors ${isVisible ? "" : "opacity-50"}`}
                >
                  {/* Toggle */}
                  <button
                    className={`shrink-0 h-5 w-5 rounded border transition-colors ${
                      isVisible
                        ? "border-accent bg-accent text-slate-950"
                        : "border-line bg-transparent text-transparent"
                    }`}
                    onClick={() => toggle(col.key)}
                    type="button"
                  >
                    <Check size={12} className="m-auto" />
                  </button>

                  {/* Editable label */}
                  <input
                    className="min-w-0 flex-1 border-b border-transparent bg-transparent text-sm text-white outline-none placeholder-slate-600 transition-colors hover:border-line focus:border-accent"
                    onChange={(e) => renameColumn(col.key, e.target.value)}
                    placeholder={col.label}
                    title="Click to rename"
                    value={columnLabels[col.key] ?? col.label}
                  />

                  {/* Type badge */}
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    isCustom ? "bg-accent/10 text-accent/70" : "bg-white/5 text-slate-600"
                  }`}>
                    {isCustom ? "custom" : "default"}
                  </span>

                  {/* Remove — show on hover */}
                  <button
                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-slate-600 hover:text-red-400"
                    onClick={() => removeColumn(col.key)}
                    title={isCustom ? "Delete column" : "Hide column"}
                    type="button"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Add custom column */}
        <section className="border-t border-line px-6 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Add custom column</h3>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-md border border-line bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-accent"
              onChange={(e) => setNewColumn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomColumn()}
              placeholder="Column name (e.g. Diameter)"
              value={newColumn}
            />
            <button
              className="flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium text-slate-300 hover:border-accent hover:text-accent"
              onClick={addCustomColumn}
              type="button"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </section>

        {/* Attribute search access */}
        {customColumns.length > 0 && (
          <section className="border-t border-line px-6 py-4">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Attribute search access</h3>
              <button
                className="text-xs text-slate-500 hover:text-accent"
                onClick={() => setAllowedSearchAttributes(allowedSearchAttributes === null ? [] : null)}
                type="button"
              >
                {allowedSearchAttributes === null ? "Restrict all" : "Allow all"}
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-600">
              {allowedSearchAttributes === null
                ? "All users can search by every attribute. Toggle individual attributes to restrict."
                : "Only the toggled attributes are searchable by employees and viewers."}
            </p>
            <div className="space-y-1">
              {customColumns.map((col) => {
                const allowed = allowedSearchAttributes === null || allowedSearchAttributes.includes(col.name);
                return (
                  <ToggleRow
                    key={col.key}
                    checked={allowed}
                    label={columnLabels[col.key] ?? col.label}
                    onChange={(v) => {
                      if (allowedSearchAttributes === null) {
                        // Switch to restricted mode keeping all except this one
                        setAllowedSearchAttributes(customColumns.map((c) => c.name).filter((n) => n !== col.name || v));
                      } else {
                        setAllowedSearchAttributes(
                          v ? [...allowedSearchAttributes, col.name] : allowedSearchAttributes.filter((n) => n !== col.name)
                        );
                      }
                    }}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Widgets */}
        <section className="border-t border-line px-6 py-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Summary widgets</h3>
          <div className="space-y-2">
            <ToggleRow
              checked={widgets.itemCount}
              label="Item count"
              onChange={(v) => setWidgets({ ...widgets, itemCount: v })}
            />
            <ToggleRow
              checked={widgets.balance}
              label="Inventory balance"
              onChange={(v) => setWidgets({ ...widgets, balance: v })}
            />
          </div>
        </section>
      </div>
    </Modal>
  );
}

function ToggleRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 hover:bg-white/[0.03]">
      <span className="text-sm text-slate-300">{label}</span>
      <div
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-accent" : "bg-slate-700"}`}
        onClick={() => onChange(!checked)}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </label>
  );
}

function settingsFromTable(table: StructuredInventoryTable | null) {
  return table?.columnSettings.visibleColumns.length ? table.columnSettings.visibleColumns : defaultStockColumns;
}

function cleanLabels(labels: Record<string, string>) {
  return Object.fromEntries(Object.entries(labels).filter(([, l]) => l.trim()).map(([k, l]) => [k, l.trim()]));
}
