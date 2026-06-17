import type React from "react";
import { Link2Off, Package, QrCode, Search, Table2, X } from "lucide-react";
import { Modal } from "../Modal";
import { useState } from "react";
import { useSlotAssignPanel } from "../../hooks/useWarehouseSlotAssign";
import type { AssignableInventoryRow, ShelfViewSlot, WarehouseSlot } from "../../types/warehouse";
import { WarehouseSlotQrScanner } from "./WarehouseSlotQrScanner";

type Props = {
  canEdit: boolean;
  onClose: () => void;
  slot: Pick<WarehouseSlot | ShelfViewSlot, "id" | "code" | "displayName">;
  warehouseId: string;
};

export function WarehouseSlotAssignPanel({ canEdit, onClose, slot, warehouseId }: Props) {
  const panel = useSlotAssignPanel(warehouseId, slot.id);
  const [method, setMethod] = useState<"select" | "qr">("select");
  const [qrOpen, setQrOpen] = useState(false);
  const hasAssignment = panel.assignments.length > 0;

  return (
    <Modal maxWidth="max-w-3xl" onClose={onClose}>
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Slot assignment</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{slot.displayName ?? slot.code}</h2>
          <p className="text-sm text-slate-400">Link a row from linked inventory. Stock quantity and placement stay unchanged.</p>
        </div>
        <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {panel.error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{panel.error}</p> : null}
        {hasAssignment ? <CurrentAssignments canEdit={canEdit} panel={panel} /> : null}
        {canEdit && !hasAssignment ? <AssignMethods method={method} panel={panel} setMethod={setMethod} setQrOpen={setQrOpen} /> : null}
        {!canEdit && !hasAssignment ? (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-slate-400">This slot has no assigned inventory.</p>
        ) : null}
      </div>

      {qrOpen ? (
        <WarehouseSlotQrScanner
          onClose={() => setQrOpen(false)}
          onCode={async (code) => {
            const result = await panel.scan(code);
            if (!result.matched) throw new Error("No unassigned linked inventory row matches this QR code.");
            setMethod("select");
          }}
        />
      ) : null}
    </Modal>
  );
}

function CurrentAssignments({ canEdit, panel }: { canEdit: boolean; panel: ReturnType<typeof useSlotAssignPanel> }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Current assignment</h3>
      <div className="space-y-2">
        {panel.assignments.map((assignment) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4" key={assignment.id}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Package className="text-emerald-300" size={15} />
                <p className="truncate font-semibold text-emerald-100">{assignment.stockBalance.itemName}</p>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {assignment.stockBalance.quantity} {assignment.stockBalance.unit}
                {assignment.stockBalance.inventoryTable ? ` | ${assignment.stockBalance.inventoryTable.name}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">{placementText(assignment.stockBalance.location?.code, assignment.stockBalance.compartment)}</p>
            </div>
            {canEdit ? (
              <button className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10" disabled={panel.isSaving} onClick={() => void panel.unassign(assignment.id)} type="button">
                <Link2Off size={14} /> Unassign
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function AssignMethods({ method, panel, setMethod, setQrOpen }: {
  method: "select" | "qr";
  panel: ReturnType<typeof useSlotAssignPanel>;
  setMethod: (method: "select" | "qr") => void;
  setQrOpen: (open: boolean) => void;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Assign inventory row</h3>
      <div className="mb-3 grid gap-2 md:grid-cols-2">
        <MethodButton active={method === "select"} icon={<Table2 size={15} />} label="Select from linked table" onClick={() => setMethod("select")} />
        <MethodButton active={method === "qr"} icon={<QrCode size={15} />} label="Scan item QR" onClick={() => { setMethod("qr"); setQrOpen(true); }} />
      </div>
      {method === "select" ? <SearchBox panel={panel} /> : (
        <button className="inline-flex items-center gap-2 rounded-md border border-accent/40 px-3 py-2 text-sm font-semibold text-accent hover:border-accent" onClick={() => setQrOpen(true)} type="button">
          <QrCode size={15} /> Open QR scanner
        </button>
      )}
      {panel.isLoading ? <div className="mt-3 h-12 animate-pulse rounded-md border border-line bg-white/5" /> : null}
      <SearchResults panel={panel} />
    </section>
  );
}

function SearchBox({ panel }: { panel: ReturnType<typeof useSlotAssignPanel> }) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
      <input
        className="w-full rounded-md border border-line bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
        onChange={(event) => void panel.search(event.target.value)}
        placeholder="Search linked tables by item, article, manufacturer, or placement..."
        value={panel.searchQuery}
      />
    </div>
  );
}

function SearchResults({ panel }: { panel: ReturnType<typeof useSlotAssignPanel> }) {
  if (!panel.isLoading && panel.searchRows.length === 0) {
    return <p className="mt-3 rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-400">No unassigned linked inventory rows found.</p>;
  }
  return <div className="mt-3 space-y-2">{panel.searchRows.map((row) => <InventoryRowOption key={row.id} onAssign={() => void panel.assign({ stockBalanceId: row.id, inventoryTableId: row.tableId ?? undefined })} row={row} saving={panel.isSaving} />)}</div>;
}

function InventoryRowOption({ onAssign, row, saving }: { onAssign: () => void; row: AssignableInventoryRow; saving: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white/[0.03] p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{row.itemName}</p>
        <p className="text-xs text-slate-400">{[row.manufacturer, row.articleNumber, row.tableName].filter(Boolean).join(" | ")}</p>
        <p className="text-xs text-slate-500">{placementText(row.locationCode, row.compartment)} | {row.quantity} {row.unit}</p>
      </div>
      <button className="shrink-0 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} onClick={onAssign} type="button">
        Assign
      </button>
    </div>
  );
}

function MethodButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${active ? "border-accent bg-accent/15 text-accent" : "border-line bg-white/[0.03] text-slate-300"}`} onClick={onClick} type="button">{icon} {label}</button>;
}

function placementText(locationCode?: string | null, compartment?: string | null) {
  return `Placement: ${locationCode ?? "Unassigned"}${compartment ? ` / FACK ${compartment}` : ""}`;
}
