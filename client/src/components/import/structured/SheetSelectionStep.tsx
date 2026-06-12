import { useEffect, useState } from "react";
import { sheetTypeOptions, targetModeOptions } from "../../../lib/import/structuredImportOptions";
import type { SheetChoice, SheetTargetMode, SheetType, StructuredImportBatch } from "../../../lib/import/structuredImportTypes";

export function SheetSelectionStep({
  batch,
  groupName,
  isLoading,
  onChangeGroupName,
  onSave,
}: {
  batch: StructuredImportBatch;
  groupName: string;
  isLoading: boolean;
  onChangeGroupName: (value: string) => void;
  onSave: (choices: SheetChoice[]) => void;
}) {
  const [choices, setChoices] = useState<SheetChoice[]>([]);

  useEffect(() => setChoices(batch.sheets.map(toChoice)), [batch.sheets]);

  function change(sheetId: string, patch: Partial<SheetChoice>) {
    setChoices((current) => current.map((choice) => (choice.sheetId === sheetId ? { ...choice, ...patch } : choice)));
  }

  return (
    <section className="space-y-4 rounded-lg border border-line bg-panel p-5">
      <div className="grid gap-3 lg:grid-cols-[1fr_260px] lg:items-end">
        <div>
          <h2 className="text-lg font-semibold text-white">Choose sheets and grouping</h2>
          <p className="mt-1 text-sm text-slate-400">Grouping is a folder only. It never merges selected sheets into one table.</p>
        </div>
        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Inventory group name</span>
          <input className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChangeGroupName(event.target.value)} value={groupName} />
        </label>
      </div>

      <div className="space-y-3">
        {batch.sheets.map((sheet) => {
          const choice = choices.find((item) => item.sheetId === sheet.id) ?? toChoice(sheet);
          return (
            <article className="rounded-lg border border-line bg-slate-950/40 p-4" key={sheet.id}>
              <div className="grid gap-3 lg:grid-cols-[1fr_220px_240px] lg:items-center">
                <label className="flex items-center gap-3 text-sm text-white">
                  <input checked={choice.selectedForImport} onChange={(event) => change(sheet.id, { selectedForImport: event.target.checked })} type="checkbox" />
                  <span><span className="font-semibold">{sheet.sheetName}</span><span className="ml-2 text-xs text-slate-500">header row {sheet.headerRowNumber ?? "?"}</span></span>
                </label>
                <select className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => change(sheet.id, { userSelectedSheetType: event.target.value as SheetType })} value={choice.userSelectedSheetType}>
                  {sheetTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <select className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => change(sheet.id, { targetMode: event.target.value as SheetTargetMode })} value={choice.targetMode}>
                  {targetModeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </article>
          );
        })}
      </div>

      <button className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isLoading} onClick={() => onSave(choices)} type="button">
        {isLoading ? "Saving..." : "Save sheet choices"}
      </button>
    </section>
  );
}

function toChoice(sheet: StructuredImportBatch["sheets"][number]): SheetChoice {
  return {
    sheetId: sheet.id,
    selectedForImport: sheet.selectedForImport,
    userSelectedSheetType: sheet.userSelectedSheetType ?? sheet.detectedSheetType ?? "generic_table",
    targetMode: sheet.targetMode ?? "create_new_table",
    targetInventoryGroupId: sheet.targetInventoryGroupId,
    targetInventoryTableId: sheet.targetInventoryTableId,
  };
}
