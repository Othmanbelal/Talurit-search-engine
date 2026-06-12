import type React from "react";
import type { StagingRow, StructuredImportBatch } from "../../lib/import/structuredImportTypes";

export function StagingPreviewStep({
  batch,
  canConfirm,
  isLoading,
  onConfirm,
  onPatchRow,
  rows,
}: {
  batch: StructuredImportBatch;
  canConfirm: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onPatchRow: (rowId: string, input: Partial<StagingRow>) => void;
  rows: StagingRow[];
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Count label="Rows" value={batch.counts.totalRows} />
        <Count label="Ready" value={batch.counts.readyRows} />
        <Count label="Review" value={batch.counts.reviewRows} />
        <Count label="Errors" value={batch.counts.errorRows} />
      </div>
      <div className="flex justify-end">
        <button
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          disabled={isLoading || !canConfirm}
          onClick={onConfirm}
          type="button"
        >
          Confirm import
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] divide-y divide-line text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <Header>Sheet</Header>
                <Header>Row</Header>
                <Header>Status</Header>
                <Header>Item</Header>
                <Header>Location</Header>
                <Header>Quantity</Header>
                <Header>Duplicate</Header>
                <Header>Message</Header>
                <Header>Actions</Header>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => <PreviewRow key={row.id} onPatchRow={onPatchRow} row={row} />)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function PreviewRow({ onPatchRow, row }: {
  onPatchRow: (rowId: string, input: Partial<StagingRow>) => void;
  row: StagingRow;
}) {
  const mapped = asMapped(row.mappedData);
  const suggested = textValue(mapped.location?.suggestedCode);
  const location = textValue(mapped.location?.code) || (suggested ? `Suggested: ${suggested}` : "-");
  const duplicate = mapped.duplicate;

  return (
    <tr className="align-top hover:bg-white/[0.03]">
      <Cell>{row.importSheet?.sheetName ?? "-"}</Cell>
      <Cell>{row.rowNumber}</Cell>
      <Cell><StatusBadge status={row.status} /></Cell>
      <Cell strong>{textValue(mapped.item?.name) || firstRawValue(row.rawRow) || "-"}</Cell>
      <Cell>{location}</Cell>
      <Cell>{textValue(mapped.stock?.quantity) ?? textValue(mapped.stock?.quantityRaw) ?? "-"}</Cell>
      <Cell>{duplicate ? <DuplicateBadge duplicate={duplicate} /> : "-"}</Cell>
      <Cell>{row.message ?? "-"}</Cell>
      <Cell>
        <div className="flex flex-wrap gap-2">
          {duplicate?.status === "possible" ? (
            <>
              <ActionButton onClick={() => onPatchRow(row.id, updateDuplicate(row, "verified"))}>Verify</ActionButton>
              <ActionButton onClick={() => onPatchRow(row.id, updateDuplicate(row, "dismissed"))}>Dismiss</ActionButton>
            </>
          ) : null}
          {suggested ? (
            <ActionButton onClick={() => onPatchRow(row.id, useSuggestedLocation(row, suggested))}>
              Use suggestion
            </ActionButton>
          ) : null}
          <ActionButton onClick={() => onPatchRow(row.id, markReady(row))}>Ready</ActionButton>
          <ActionButton onClick={() => onPatchRow(row.id, markUnassigned(row))}>Unassigned</ActionButton>
          <ActionButton onClick={() => onPatchRow(row.id, { status: "ignored", message: "Ignored by user." })}>
            Ignore
          </ActionButton>
        </div>
      </Cell>
    </tr>
  );
}

function useSuggestedLocation(row: StagingRow, suggested: string): Partial<StagingRow> {
  const mappedData = asMapped(row.mappedData);
  mappedData.location = { ...(mappedData.location ?? {}), code: suggested };
  return { mappedData, status: "ready", message: null };
}

function markUnassigned(row: StagingRow): Partial<StagingRow> {
  const mappedData = asMapped(row.mappedData);
  mappedData.location = { ...(mappedData.location ?? {}), code: null };
  return { mappedData, status: "ready", message: "Imported without assigned location." };
}

function markReady(row: StagingRow): Partial<StagingRow> {
  return { mappedData: row.mappedData, status: "ready", message: null };
}

function updateDuplicate(row: StagingRow, status: "verified" | "dismissed"): Partial<StagingRow> {
  const mappedData = asMapped(row.mappedData);
  if (mappedData.duplicate) mappedData.duplicate = { ...mappedData.duplicate, status };
  return { mappedData, status: row.status, message: row.message };
}

type MappedRow = {
  item?: Record<string, unknown>;
  stock?: Record<string, unknown>;
  location?: Record<string, unknown>;
  duplicate?: {
    status: "possible" | "verified" | "dismissed";
    message: string;
    keys: string[];
  };
};

function asMapped(value: unknown): MappedRow {
  if (!value || typeof value !== "object") return {};
  return structuredClone(value) as MappedRow;
}

function textValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function firstRawValue(rawRow: Record<string, unknown>) {
  const value = Object.values(rawRow).find((candidate) => textValue(candidate));
  return textValue(value);
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-4">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`px-4 py-3 ${strong ? "font-semibold text-white" : "text-slate-300"}`}>{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "ready" ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
    : status === "ignored" ? "border-slate-500/40 bg-slate-500/10 text-slate-200"
      : "border-amber-400/40 bg-amber-500/10 text-amber-100";
  return <span className={`rounded border px-2 py-1 text-xs font-semibold ${tone}`}>{status}</span>;
}

function DuplicateBadge({ duplicate }: { duplicate: NonNullable<MappedRow["duplicate"]> }) {
  const tone = duplicate.status === "possible"
    ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
    : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  return (
    <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${tone}`} title={duplicate.message}>
      {duplicate.status}
    </span>
  );
}

function ActionButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      className="rounded border border-line bg-white/[0.04] px-2 py-1 text-xs font-semibold text-slate-200 hover:border-accent hover:text-accent"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
