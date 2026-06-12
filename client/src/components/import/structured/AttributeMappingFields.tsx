import type { StructuredMapping } from "../../../lib/import/structuredImportTypes";

export function AttributeMappingFields({
  mapping,
  onChange,
}: {
  mapping: StructuredMapping;
  onChange: (patch: Partial<StructuredMapping>) => void;
}) {
  if (mapping.targetType !== "item_attribute") return null;
  return (
    <div className="grid gap-2 md:grid-cols-3">
      <input
        className="rounded-md border border-line bg-slate-950 px-3 py-2 text-xs text-white"
        onChange={(event) => onChange({ attributeName: event.target.value })}
        placeholder="attribute name"
        value={mapping.attributeName ?? ""}
      />
      <input
        className="rounded-md border border-line bg-slate-950 px-3 py-2 text-xs text-white"
        onChange={(event) => onChange({ attributeUnit: event.target.value })}
        placeholder="unit, e.g. mm"
        value={mapping.attributeUnit ?? ""}
      />
      <select
        className="rounded-md border border-line bg-slate-950 px-3 py-2 text-xs text-white"
        onChange={(event) => onChange({ attributeDataType: event.target.value })}
        value={mapping.attributeDataType ?? "text"}
      >
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="decimal">Decimal</option>
        <option value="date">Date</option>
        <option value="mixed">Mixed</option>
      </select>
    </div>
  );
}
