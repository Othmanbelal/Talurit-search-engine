import { Check, Filter, Plus, Search, Settings2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type {
  AttributeFilter,
  StructuredTableFilterOptions,
  StructuredTableFilters,
} from "../../types/structured-inventory";

type Props = {
  /** null = no restriction; array = only these attribute names shown to non-managers */
  allowedSearchAttributes?: string[] | null;
  /** When true, show the configure-access gear inside the attributes panel */
  canManage?: boolean;
  filters: StructuredTableFilters;
  onFilters: (filters: StructuredTableFilters) => void;
  onReset: () => void;
  onSaveAllowedAttributes?: (allowed: string[] | null) => Promise<void>;
  onSearch: (event: FormEvent) => void;
  options: StructuredTableFilterOptions;
  search: string;
  setSearch: (value: string) => void;
};

export function StructuredTableSearchFilters({
  allowedSearchAttributes,
  canManage,
  filters,
  onFilters,
  onReset,
  onSaveAllowedAttributes,
  onSearch,
  options,
  search,
  setSearch,
}: Props) {
  const [attributesOpen, setAttributesOpen] = useState(false);

  // Non-managers only see the allowed subset; managers see everything
  const visibleAttributes = !canManage && allowedSearchAttributes != null
    ? options.attributes.filter((a) => allowedSearchAttributes.includes(a.name))
    : options.attributes;

  const filteredOptions = { ...options, attributes: visibleAttributes };
  const attributeFilters = filters.attributeFilters ?? [];
  const activeAttributeCount = attributeFilters.filter((f) => f.name && f.value).length;
  const isAttributePanelOpen = attributesOpen || attributeFilters.length > 0;

  return (
    <form className="rounded-lg border border-line bg-white/[0.04] p-3" onSubmit={onSearch}>
      <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_210px_210px_auto_auto]">
        <input
          className="min-w-0 rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search text, article, location..."
          value={search}
        />
        <Select label="All items" onChange={(v) => onFilters({ ...filters, itemName: v })} options={options.itemNames} value={filters.itemName ?? ""} />
        <Select label="All manufacturers" onChange={(v) => onFilters({ ...filters, manufacturerName: v })} options={options.manufacturers} value={filters.manufacturerName ?? ""} />
        {(visibleAttributes.length > 0 || canManage) ? (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent"
            onClick={() => setAttributesOpen((c) => !c)}
            type="button"
          >
            <Filter size={16} /> Attributes {activeAttributeCount > 0 ? `(${activeAttributeCount})` : ""}
          </button>
        ) : null}
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" type="submit">
          <Search size={16} /> Search
        </button>
      </div>

      {isAttributePanelOpen ? (
        <AttributeFilters
          allAttributes={options.attributes}
          allowedSearchAttributes={allowedSearchAttributes ?? null}
          canManage={canManage}
          filters={attributeFilters}
          onAdd={() => onFilters({ ...filters, attributeFilters: [...attributeFilters, emptyAttributeFilter(filteredOptions)] })}
          onChange={(next) => onFilters({ ...filters, attributeFilters: next })}
          onSaveAllowedAttributes={onSaveAllowedAttributes}
          options={filteredOptions}
        />
      ) : null}

      <div className="mt-2 flex justify-end">
        <button className="text-xs font-semibold text-slate-400 hover:text-white" onClick={onReset} type="button">Reset filters</button>
      </div>
    </form>
  );
}

function AttributeFilters({
  allAttributes,
  allowedSearchAttributes,
  canManage,
  filters,
  onAdd,
  onChange,
  onSaveAllowedAttributes,
  options,
}: {
  allAttributes: StructuredTableFilterOptions["attributes"];
  allowedSearchAttributes: string[] | null;
  canManage?: boolean;
  filters: AttributeFilter[];
  onAdd: () => void;
  onChange: (filters: AttributeFilter[]) => void;
  onSaveAllowedAttributes?: (allowed: string[] | null) => Promise<void>;
  options: StructuredTableFilterOptions;
}) {
  const [configMode, setConfigMode] = useState(false);
  // Draft allowed list while in config mode: null = all allowed
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  function openConfig() {
    setDraft(allowedSearchAttributes);
    setConfigMode(true);
  }

  async function saveConfig() {
    if (!onSaveAllowedAttributes) return;
    setSaving(true);
    try {
      await onSaveAllowedAttributes(draft);
      setConfigMode(false);
    } finally {
      setSaving(false);
    }
  }

  if (configMode && canManage) {
    const effectiveDraft = draft;
    return (
      <section className="mt-3 rounded-md border border-accent/30 bg-accent/5 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Configure attribute search access</p>
            <p className="text-xs text-slate-400">Choose which attributes employees and viewers can filter by. Managers always see all.</p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-line"
              onClick={() => setConfigMode(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-50"
              disabled={saving}
              onClick={() => void saveConfig()}
              type="button"
            >
              <Check size={12} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <button
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${effectiveDraft === null ? "border-accent bg-accent/20 text-accent" : "border-line text-slate-500 hover:border-slate-500"}`}
            onClick={() => setDraft(null)}
            type="button"
          >
            All attributes
          </button>
          <button
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${effectiveDraft !== null ? "border-accent bg-accent/20 text-accent" : "border-line text-slate-500 hover:border-slate-500"}`}
            onClick={() => setDraft(effectiveDraft === null ? [] : effectiveDraft)}
            type="button"
          >
            Selected only
          </button>
        </div>

        {effectiveDraft !== null && (
          <div className="space-y-1.5">
            {allAttributes.length === 0 && (
              <p className="text-xs text-slate-500">No attributes exist in this table yet.</p>
            )}
            {allAttributes.map((attr) => {
              const allowed = effectiveDraft.includes(attr.name);
              return (
                <label key={attr.name} className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 hover:bg-white/[0.03]">
                  <span className="text-sm text-slate-300">{attr.label ?? attr.name}</span>
                  <div
                    className={`relative h-5 w-9 rounded-full transition-colors ${allowed ? "bg-accent" : "bg-slate-700"}`}
                    onClick={() => setDraft(allowed ? effectiveDraft.filter((n) => n !== attr.name) : [...effectiveDraft, attr.name])}
                  >
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${allowed ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mt-3 rounded-md border border-line bg-slate-950/35 p-3">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold text-white">Attribute filters</p>
          <p className="text-xs text-slate-400">Choose a column attribute, then choose one of the values found in this table.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && onSaveAllowedAttributes ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm text-slate-400 hover:border-accent hover:text-accent"
              onClick={openConfig}
              title="Configure which attributes other users can search by"
              type="button"
            >
              <Settings2 size={14} /> Configure access
            </button>
          ) : null}
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent"
            disabled={options.attributes.length === 0}
            onClick={onAdd}
            type="button"
          >
            <Plus size={15} /> Add filter
          </button>
        </div>
      </div>
      {options.attributes.length === 0 ? <p className="mt-3 text-sm text-slate-500">This table has no saved item attributes yet.</p> : null}
      <div className="mt-3 space-y-2">
        {filters.map((filter, index) => (
          <AttributeFilterRow
            filter={filter}
            key={`${filter.name}-${index}`}
            onChange={(next) => onChange(replaceAt(filters, index, next))}
            onRemove={() => onChange(filters.filter((_, i) => i !== index))}
            options={options}
          />
        ))}
      </div>
    </section>
  );
}

function AttributeFilterRow({
  filter,
  onChange,
  onRemove,
  options,
}: {
  filter: AttributeFilter;
  onChange: (filter: AttributeFilter) => void;
  onRemove: () => void;
  options: StructuredTableFilterOptions;
}) {
  const attribute = options.attributes.find((o) => o.name === filter.name);
  return (
    <div className="grid gap-2 md:grid-cols-[minmax(180px,260px)_1fr_auto]">
      <select
        className="rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(e) => onChange({ name: e.target.value, value: "" })}
        value={filter.name}
      >
        <option value="">Choose attribute</option>
        {options.attributes.map((o) => <option key={o.name} value={o.name}>{o.label}</option>)}
      </select>
      <select
        className="rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white disabled:opacity-50"
        disabled={!attribute}
        onChange={(e) => onChange({ ...filter, value: e.target.value })}
        value={filter.value}
      >
        <option value="">Choose value</option>
        {(attribute?.values ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20" onClick={onRemove} title="Remove" type="button">
        <X size={16} />
      </button>
    </div>
  );
}

function Select({ label, onChange, options, value }: { label: string; onChange: (v: string) => void; options: string[]; value: string }) {
  return (
    <select className="rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(e) => onChange(e.target.value)} value={value}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function emptyAttributeFilter(options: StructuredTableFilterOptions): AttributeFilter {
  const first = options.attributes[0];
  return { name: first?.name ?? "", value: "" };
}

function replaceAt(filters: AttributeFilter[], index: number, next: AttributeFilter) {
  return filters.map((f, i) => (i === index ? next : f));
}
