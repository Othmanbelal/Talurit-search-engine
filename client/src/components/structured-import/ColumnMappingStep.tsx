import { useMemo, useState } from "react";
import { mappingTargetOptions } from "../../lib/import/structuredImportOptions";
import { confidenceText, fieldForTarget, needsAttributeDetails } from "../../lib/import/structuredImportFormatters";
import type { MappingTargetType, StructuredImportBatch, StructuredMapping } from "../../lib/import/structuredImportTypes";

export function ColumnMappingStep({
  batch,
  isLoading,
  onContinue,
}: {
  batch: StructuredImportBatch;
  isLoading: boolean;
  onContinue: (drafts: Record<string, StructuredMapping[]>) => void;
}) {
  const selectedSheets = batch.sheets.filter((sheet) => sheet.selectedForImport && sheet.targetMode !== "ignore");
  const initialDrafts = useMemo(() => buildDrafts(selectedSheets), [selectedSheets]);
  const [drafts, setDrafts] = useState(initialDrafts);

  function updateMapping(sheetId: string, columnIndex: number, patch: Partial<StructuredMapping>) {
    setDrafts((current) => ({
      ...current,
      [sheetId]: current[sheetId].map((mapping) =>
        mapping.columnIndex === columnIndex ? normalizeMapping({ ...mapping, ...patch }) : mapping,
      ),
    }));
  }

  return (
    <section className="space-y-4">
      <MappingSummary sheets={selectedSheets} drafts={drafts} />
      {selectedSheets.map((sheet) => (
        <article className="rounded-lg border border-line bg-panel p-4" key={sheet.id}>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">{sheet.sheetName}</h2>
            <p className="mt-1 text-sm text-slate-400">{drafts[sheet.id]?.length ?? 0} mapped columns</p>
          </div>
          <div className="space-y-3">
            {(drafts[sheet.id] ?? []).map((mapping) => (
            <MappingRow
                key={`${sheet.id}-${mapping.columnIndex}`}
                mapping={mapping}
                onChange={(patch) => updateMapping(sheet.id, mapping.columnIndex, patch)}
              />
            ))}
          </div>
        </article>
      ))}
      <div className="flex justify-end">
        <button
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          disabled={isLoading || selectedSheets.length === 0}
          onClick={() => onContinue(drafts)}
          type="button"
        >
          Stage rows for preview
        </button>
      </div>
    </section>
  );
}

function MappingSummary({
  drafts,
  sheets,
}: {
  drafts: Record<string, StructuredMapping[]>;
  sheets: StructuredImportBatch["sheets"];
}) {
  const mapped = sheets.reduce((sum, sheet) => sum + (drafts[sheet.id] ?? []).filter((mapping) => mapping.targetType !== "ignore").length, 0);
  const ignored = sheets.reduce((sum, sheet) => sum + (drafts[sheet.id] ?? []).filter((mapping) => mapping.targetType === "ignore").length, 0);

  return (
    <div className="grid gap-3 rounded-lg border border-line bg-panel p-4 md:grid-cols-3">
      <SummaryValue label="Selected sheets" value={sheets.length} />
      <SummaryValue label="Mapped columns" value={mapped} />
      <SummaryValue label="Ignored columns" value={ignored} />
    </div>
  );
}

function SummaryValue({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-white/[0.04] p-3">
      <div className="text-xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
    </div>
  );
}

function MappingRow({
  mapping,
  onChange,
}: {
  mapping: StructuredMapping;
  onChange: (patch: Partial<StructuredMapping>) => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-line bg-white/[0.03] p-3 xl:grid-cols-[1fr_190px_180px]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-semibold text-white">{mapping.excelHeader}</div>
          <span className="rounded border border-line bg-slate-950/70 px-2 py-0.5 text-xs text-slate-400">
            {confidenceText(mapping.confidence)}
          </span>
        </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(mapping.sampleValues ?? []).slice(0, 5).map((sample) => (
            <span className="rounded border border-line bg-slate-950/70 px-2 py-1 text-xs text-slate-300" key={sample}>
              {sample}
            </span>
            ))}
          </div>
          <div className="mt-2 text-xs text-slate-400">Suggested: {targetLabel(mapping)}</div>
        </div>
      <SelectTarget mapping={mapping} onChange={onChange} />
      <MappingDetails mapping={mapping} onChange={onChange} />
    </div>
  );
}

function targetLabel(mapping: StructuredMapping) {
  const option = mappingTargetOptions.find((candidate) => candidate.value === mapping.targetType);
  const detail = mapping.attributeName || mapping.targetField;
  return detail ? `${option?.label ?? mapping.targetType} -> ${detail}` : option?.label ?? mapping.targetType;
}

function SelectTarget({ mapping, onChange }: {
  mapping: StructuredMapping;
  onChange: (patch: Partial<StructuredMapping>) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">Map to</span>
      <select
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(event) => onChange({
          targetType: event.target.value as MappingTargetType,
          targetField: fieldForTarget(event.target.value as MappingTargetType),
        })}
        value={mapping.targetType}
      >
        {mappingTargetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function MappingDetails({ mapping, onChange }: {
  mapping: StructuredMapping;
  onChange: (patch: Partial<StructuredMapping>) => void;
}) {
  if (needsAttributeDetails(mapping)) {
    return (
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-1">
        <TextInput label="Attribute" onChange={(value) => onChange({ attributeName: value })} value={mapping.attributeName ?? ""} />
        <TextInput label="Unit" onChange={(value) => onChange({ attributeUnit: value })} value={mapping.attributeUnit ?? ""} />
        <TextInput label="Type" onChange={(value) => onChange({ attributeDataType: value })} value={mapping.attributeDataType ?? ""} />
      </div>
    );
  }

  if (mapping.targetType === "identifier") {
    return <TextInput label="Identifier type" onChange={(value) => onChange({ targetField: value })} value={mapping.targetField ?? ""} />;
  }

  return <TextInput label="Field" onChange={(value) => onChange({ targetField: value })} value={mapping.targetField ?? ""} />;
}

function TextInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <input
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function buildDrafts(sheets: StructuredImportBatch["sheets"]) {
  return Object.fromEntries(sheets.map((sheet) => [sheet.id, sheet.mappings.map(normalizeMapping)]));
}

function normalizeMapping(mapping: StructuredMapping): StructuredMapping {
  return { ...mapping, targetField: fieldForTarget(mapping.targetType, mapping.targetField) };
}
