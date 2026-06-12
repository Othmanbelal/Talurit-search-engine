import { useState } from "react";
import { sheetTypeOptions, targetModeOptions } from "../../lib/import/structuredImportOptions";
import type { SheetChoice, SheetTargetMode, SheetType, StructuredImportBatch } from "../../lib/import/structuredImportTypes";

export function SheetSelectionStep({
  batch,
  groupName,
  isLoading,
  onGroupNameChange,
  onSave,
}: {
  batch: StructuredImportBatch;
  groupName: string;
  isLoading: boolean;
  onGroupNameChange: (value: string) => void;
  onSave: (choices: SheetChoice[]) => void;
}) {
  const [choices, setChoices] = useState<Record<string, SheetChoice>>(() =>
    Object.fromEntries(batch.sheets.map((sheet) => [sheet.id, sheetChoice(sheet)])),
  );
  const selectedCount = Object.values(choices).filter((choice) => choice.selectedForImport).length;

  function updateChoice(sheetId: string, patch: Partial<SheetChoice>) {
    setChoices((current) => ({ ...current, [sheetId]: { ...current[sheetId], ...patch } }));
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-line bg-panel p-4">
        <label className="block max-w-xl">
          <span className="mb-2 block text-sm font-medium text-slate-300">Inventory group name</span>
          <input
            className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
            onChange={(event) => onGroupNameChange(event.target.value)}
            value={groupName}
          />
        </label>
      </div>
      <div className="space-y-3">
        {batch.sheets.map((sheet) => (
          <article className="rounded-lg border border-line bg-panel p-4" key={sheet.id}>
            <div className="grid gap-3 lg:grid-cols-[auto_1fr_180px_220px_120px] lg:items-end">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  checked={choices[sheet.id]?.selectedForImport ?? false}
                  onChange={(event) => updateChoice(sheet.id, { selectedForImport: event.target.checked })}
                  type="checkbox"
                />
                Import
              </label>
              <div>
                <div className="font-semibold text-white">{sheet.sheetName}</div>
                <div className="mt-1 text-xs text-slate-400">
                  Header row {sheet.headerRowNumber ?? "-"} · {sheet.mappings.length} columns
                </div>
              </div>
              <Select
                label="Sheet type"
                onChange={(value) => updateChoice(sheet.id, { userSelectedSheetType: value as SheetType })}
                options={sheetTypeOptions}
                value={choices[sheet.id]?.userSelectedSheetType ?? "generic_table"}
              />
              <Select
                label="Target"
                onChange={(value) => updateChoice(sheet.id, { targetMode: value as SheetTargetMode })}
                options={targetModeOptions}
                value={choices[sheet.id]?.targetMode ?? "group_with_other_sheets"}
              />
              <label className="block">
                <span className="mb-2 block text-xs font-medium uppercase text-slate-400">Header</span>
                <input
                  className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
                  min={1}
                  onChange={(event) => updateChoice(sheet.id, { headerRowNumber: Number(event.target.value) || null })}
                  type="number"
                  value={choices[sheet.id]?.headerRowNumber ?? ""}
                />
              </label>
            </div>
          </article>
        ))}
      </div>
      <div className="flex justify-end">
        <button
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          disabled={isLoading || selectedCount === 0}
          onClick={() => onSave(Object.values(choices))}
          type="button"
        >
          Continue to mappings
        </button>
      </div>
    </section>
  );
}

function sheetChoice(sheet: StructuredImportBatch["sheets"][number]): SheetChoice {
  return {
    sheetId: sheet.id,
    selectedForImport: sheet.selectedForImport,
    userSelectedSheetType: sheet.userSelectedSheetType ?? sheet.detectedSheetType ?? "generic_table",
    headerRowNumber: sheet.headerRowNumber,
    targetMode: sheet.targetMode ?? "group_with_other_sheets",
    targetInventoryGroupId: sheet.targetInventoryGroupId,
    targetInventoryTableId: sheet.targetInventoryTableId,
  };
}

function Select({ label, onChange, options, value }: {
  label: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <select
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
