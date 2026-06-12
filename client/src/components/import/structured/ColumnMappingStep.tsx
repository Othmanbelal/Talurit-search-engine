import { useEffect, useState } from "react";
import { mappingTargetOptions } from "../../../lib/import/structuredImportOptions";
import { confidenceText, fieldForTarget } from "../../../lib/import/structuredImportFormatters";
import type { MappingTargetType, StructuredImportBatch, StructuredMapping } from "../../../lib/import/structuredImportTypes";
import { AttributeMappingFields } from "./AttributeMappingFields";

export function ColumnMappingStep({
  batch,
  isLoading,
  onSaveMappings,
  onStage,
}: {
  batch: StructuredImportBatch;
  isLoading: boolean;
  onSaveMappings: (sheetId: string, mappings: StructuredMapping[]) => Promise<void>;
  onStage: () => void;
}) {
  const selectedSheets = batch.sheets.filter((sheet) => sheet.selectedForImport && sheet.targetMode !== "ignore");
  const [edited, setEdited] = useState<Record<string, StructuredMapping[]>>({});

  useEffect(() => {
    setEdited(Object.fromEntries(selectedSheets.map((sheet) => [sheet.id, sheet.mappings])));
  }, [batch.id]);

  function patch(sheetId: string, index: number, patchValue: Partial<StructuredMapping>) {
    setEdited((current) => ({
      ...current,
      [sheetId]: (current[sheetId] ?? []).map((mapping, mappingIndex) =>
        mappingIndex === index ? { ...mapping, ...patchValue } : mapping,
      ),
    }));
  }

  async function saveAll() {
    for (const sheet of selectedSheets) await onSaveMappings(sheet.id, edited[sheet.id] ?? sheet.mappings);
    onStage();
  }

  return (
    <section className="space-y-4 rounded-lg border border-line bg-panel p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Map columns</h2>
        <p className="mt-1 text-sm text-slate-400">Confirm what each Excel column means before rows are staged.</p>
      </div>
      {selectedSheets.map((sheet) => (
        <article className="space-y-3 rounded-lg border border-line bg-slate-950/40 p-4" key={sheet.id}>
          <h3 className="font-semibold text-white">{sheet.sheetName}</h3>
          {(edited[sheet.id] ?? sheet.mappings).map((mapping, index) => (
            <div className="grid gap-2 rounded-md border border-line bg-white/[0.03] p-3 lg:grid-cols-[1fr_220px]" key={`${mapping.excelHeader}-${mapping.columnIndex}`}>
              <div>
                <div className="text-sm font-medium text-white">{mapping.excelHeader}</div>
                <div className="text-xs text-slate-500">Confidence {confidenceText(mapping.confidence)}</div>
                <AttributeMappingFields mapping={mapping} onChange={(value) => patch(sheet.id, index, value)} />
              </div>
              <select
                className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white"
                onChange={(event) => {
                  const targetType = event.target.value as MappingTargetType;
                  patch(sheet.id, index, { targetType, targetField: fieldForTarget(targetType, mapping.targetField) });
                }}
                value={mapping.targetType}
              >
                {mappingTargetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          ))}
        </article>
      ))}
      <button className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isLoading} onClick={() => void saveAll()} type="button">
        {isLoading ? "Staging..." : "Save mappings and stage rows"}
      </button>
    </section>
  );
}
