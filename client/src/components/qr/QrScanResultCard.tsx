import { AlertTriangle, FileText, MapPin, Navigation, PackageMinus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../services/http";
import { itemNotesService } from "../../services/itemNotesService";
import { urgentIssuesService } from "../../services/urgentIssuesService";
import type { QrScanResult, QrScanRow } from "../../types/qr-scan";

type Props = {
  canWrite?: boolean;
  onClose: () => void;
  onMove: (row: QrScanRow) => Promise<void>;
  result: QrScanResult;
  canMove?: boolean;
};

export function QrScanResultCard({ canMove = true, canWrite = true, onClose, onMove, result }: Props) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(result.rows[0]?.stockBalanceId ?? "");
  const [note, setNote] = useState("");
  const [issue, setIssue] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const row = useMemo(() => result.rows.find((candidate) => candidate.stockBalanceId === selectedId) ?? result.rows[0], [result.rows, selectedId]);

  // Reset form state when the user switches between matched rows.
  useEffect(() => {
    setMessage(null);
    setNote("");
    setIssue("");
  }, [selectedId]);

  if (!result.matched || !row) {
    return (
      <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-5">
        <p className="font-semibold text-amber-100">No item is linked to this QR code.</p>
        <p className="mt-1 text-sm text-amber-100/70">Scanned value: {result.scannedCode}</p>
      </div>
    );
  }

  function takeMeThere() {
    if (!row.table) return;
    const params = new URLSearchParams({ highlight: row.stockBalanceId, search: row.item.name });
    navigate(`/inventory/tables/${row.table.id}?${params.toString()}`);
    onClose();
  }

  async function handleMove() {
    setMessage(null);
    try {
      await onMove(row);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to open movement. Try again.");
    }
  }

  async function submitNote(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    await saveAction(() => itemNotesService.create(row.stockBalanceId, note.trim()), "Note added.");
    setNote("");
  }

  async function submitIssue(event: FormEvent) {
    event.preventDefault();
    if (!row.table || issue.trim().length < 10) return;
    await saveAction(() => urgentIssuesService.create(row.table!.id, row.stockBalanceId, issue.trim()), "Urgent issue reported.");
    setIssue("");
  }

  async function saveAction(action: () => Promise<unknown>, success: string) {
    setIsSaving(true);
    setMessage(null);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="space-y-4 rounded-lg border border-line bg-white/[0.03] p-4">
      {result.rows.length > 1 ? (
        <select className="w-full rounded-md border border-line bg-slate-900 px-3 py-2 text-sm text-white" onChange={(event) => setSelectedId(event.target.value)} value={selectedId}>
          {result.rows.map((candidate) => (
            <option key={candidate.stockBalanceId} value={candidate.stockBalanceId}>
              {candidate.item.name} - {candidate.table?.name ?? "No table"} - {candidate.location?.code ?? "No location"}
            </option>
          ))}
        </select>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
        <ImagePreview row={row} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">Matched item</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{row.item.name}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {[row.item.articleNumber, row.item.manufacturer, row.item.category].filter(Boolean).join(" / ") || "No article metadata"}
          </p>
          <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <Info label="Table" value={row.table?.name ?? "-"} />
            <Info label="Quantity" value={`${row.quantity} ${row.unit}`} />
            <Info label="Location" value={formatLocation(row)} />
            <Info label="Warehouse" value={formatWarehouse(row)} />
          </div>
        </div>
      </div>

      <section className="rounded-md border border-line bg-slate-950/50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Managers</p>
        {row.managers.length === 0 ? <p className="text-sm text-slate-500">No manager assigned to this table.</p> : (
          <div className="flex flex-wrap gap-2">
            {row.managers.map((manager) => (
              <span className="rounded-full border border-line px-3 py-1 text-xs text-slate-200" key={`${manager.scope}:${manager.id}`}>
                {manager.name} / {manager.email}
              </span>
            ))}
          </div>
        )}
      </section>

      {row.usedIn.length > 0 ? (
        <section className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          Used in {row.usedIn.map((item) => `${item.quantity} x ${item.cardName}${item.spotName ? ` (${item.spotName})` : ""}`).join(", ")}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {row.table ? (
          <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" onClick={takeMeThere} type="button">
            <Navigation size={15} /> Take me there
          </button>
        ) : null}
        {canMove && canWrite ? (
          <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent" onClick={() => void handleMove()} type="button">
            <PackageMinus size={15} /> Take out / Use in
          </button>
        ) : null}
      </div>

      {canWrite ? (
        <>
          <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submitNote}>
            <input className="rounded-md border border-line bg-slate-900 px-3 py-2 text-sm text-white" onChange={(event) => setNote(event.target.value)} placeholder="Add note to this item" value={note} />
            <button className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50" disabled={isSaving || !note.trim()} type="submit">
              <FileText size={14} /> Add note
            </button>
          </form>

          <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submitIssue}>
            <input className="rounded-md border border-red-400/30 bg-red-950/20 px-3 py-2 text-sm text-white" onChange={(event) => setIssue(event.target.value)} placeholder="Report urgent issue" value={issue} />
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={isSaving || issue.trim().length < 10 || !row.table} type="submit">
              <AlertTriangle size={14} /> Report
            </button>
          </form>
        </>
      ) : null}

      {message ? <p className="rounded-md border border-line bg-white/[0.04] p-3 text-sm text-slate-200">{message}</p> : null}
    </article>
  );
}

function ImagePreview({ row }: { row: QrScanRow }) {
  const src = row.item.imageUrl ? buildApiUrl(row.item.imageUrl) : null;
  return src ? (
    <img alt={row.item.name} className="h-28 w-28 rounded-lg border border-line object-cover" src={src} />
  ) : (
    <div className="grid h-28 w-28 place-items-center rounded-lg border border-dashed border-line text-center text-xs text-slate-500">No picture</div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function formatLocation(row: QrScanRow) {
  if (!row.location) return "No assigned location";
  return `${row.location.code}${row.compartment ? ` / FACK ${row.compartment}` : ""}`;
}

function formatWarehouse(row: QrScanRow) {
  if (row.warehousePlacements.length === 0) return "-";
  return row.warehousePlacements
    .map((p) => `${p.warehouseName} / ${p.shelfName} / ${p.slotName ?? p.slotCode}`)
    .join("; ");
}
