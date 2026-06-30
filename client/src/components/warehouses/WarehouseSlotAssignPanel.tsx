import type React from "react";
import { Boxes, Link2Off, Package, QrCode, Search, Settings2, Table2, X } from "lucide-react";
import { Modal } from "../Modal";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSlotAssignPanel } from "../../hooks/useWarehouseSlotAssign";
import { updateWarehouseSlotRequest } from "../../services/warehouse.service";
import type { AssignableInventoryRow, ShelfViewSlot, WarehouseSlot } from "../../types/warehouse";
import { WarehouseSlotQrScanner } from "./WarehouseSlotQrScanner";

type SlotProp = Pick<WarehouseSlot | ShelfViewSlot, "id" | "slotIndex"> &
  Partial<Pick<WarehouseSlot, "capacity" | "fackEnabled" | "fackCount">>;

type Props = {
  canEdit: boolean;
  onClose: () => void;
  slot: SlotProp;
  warehouseId: string;
};

export function WarehouseSlotAssignPanel({ canEdit, onClose, slot, warehouseId }: Props) {
  const { t } = useTranslation("warehouses");
  const panel = useSlotAssignPanel(warehouseId, slot.id);
  const [method, setMethod] = useState<"select" | "qr">("select");
  const [qrOpen, setQrOpen] = useState(false);
  const [container, setContainer] = useState<"pallet" | "box">("pallet");
  const [capacity, setCapacity] = useState(slot.capacity ?? 1);
  const [fackEnabled, setFackEnabled] = useState(slot.fackEnabled ?? false);

  const used = panel.assignments.length;
  const hasFreeCapacity = used < capacity;

  return (
    <Modal maxWidth="max-w-3xl" onClose={onClose}>
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t("slotAssign.title")}</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{physicalSlotLabel(slot.slotIndex, t)}</h2>
          <p className="mt-1 text-sm text-slate-400">
            {fackEnabled ? t("slotAssign.fackUsed", { used, capacity }) : used > 0 ? t("slotAssign.itemAssigned") : t("slotAssign.emptySlot")}
          </p>
        </div>
        <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {panel.error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{panel.error}</p> : null}
        {canEdit ? (
          <FackConfig
            enabled={fackEnabled}
            capacity={capacity}
            usedCount={used}
            onSaved={(nextEnabled, nextCapacity) => { setFackEnabled(nextEnabled); setCapacity(nextCapacity); }}
            slotId={slot.id}
            warehouseId={warehouseId}
          />
        ) : null}
        {used > 0 ? <CurrentAssignments canEdit={canEdit} panel={panel} /> : null}
        {canEdit && hasFreeCapacity ? (
          <AssignMethods
            container={container}
            method={method}
            panel={panel}
            setContainer={setContainer}
            setMethod={setMethod}
            setQrOpen={setQrOpen}
          />
        ) : null}
        {canEdit && !hasFreeCapacity ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-slate-400">{t("slotAssign.slotFull")}</p>
        ) : null}
        {!canEdit && used === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-slate-400">{t("slotAssign.noAssignedInventory")}</p>
        ) : null}
      </div>

      {qrOpen ? (
        <WarehouseSlotQrScanner
          onClose={() => setQrOpen(false)}
          onCode={async (code) => {
            const result = await panel.scan(code);
            if (!result.matched) throw new Error("No linked inventory row matches this QR code.");
            setMethod("select");
          }}
        />
      ) : null}
    </Modal>
  );
}

function FackConfig({ capacity, enabled, onSaved, slotId, usedCount, warehouseId }: {
  capacity: number;
  enabled: boolean;
  onSaved: (enabled: boolean, capacity: number) => void;
  slotId: string;
  usedCount: number;
  warehouseId: string;
}) {
  const { t } = useTranslation("warehouses");
  const [open, setOpen] = useState(false);
  const [draftEnabled, setDraftEnabled] = useState(enabled);
  const [count, setCount] = useState(String(enabled ? capacity : 4));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const parsed = draftEnabled ? Number(count) : 1;
    if (draftEnabled && (!Number.isInteger(parsed) || parsed < 1)) { setError(t("slotAssign.fackError")); return; }
    if (parsed < usedCount) { setError(t("slotAssign.fackHoldsItems", { count: usedCount })); return; }
    setSaving(true);
    setError(null);
    try {
      await updateWarehouseSlotRequest(warehouseId, slotId, { fackEnabled: draftEnabled, fackCount: draftEnabled ? parsed : null });
      onSaved(draftEnabled, draftEnabled ? parsed : 1);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("qrScanner.qrLookupFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 hover:border-accent hover:text-accent" onClick={() => setOpen(true)} type="button">
        <Settings2 size={14} /> {t("slotAssign.fackSettings")} {enabled ? t("slotAssign.fackOn", { capacity }) : t("slotAssign.fackOff")}
      </button>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/[0.04] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">{t("slotAssign.fackSettings")}</h3>
      <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
        {t("slotAssign.divideFack")}
        <input checked={draftEnabled} onChange={(e) => setDraftEnabled(e.target.checked)} type="checkbox" className="h-4 w-4 accent-[var(--accent,#f0a500)]" />
      </label>
      {draftEnabled ? (
        <label className="block text-sm text-slate-300">
          {t("slotAssign.fackCellCount")}
          <input className="mt-1 w-24 rounded-md border border-line bg-slate-950 px-2 py-1.5 text-sm text-white" min={1} onChange={(e) => setCount(e.target.value)} type="number" value={count} />
        </label>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-slate-200" onClick={() => setOpen(false)} type="button">{t("inventoryLinks.cancel")}</button>
        <button className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} onClick={() => void save()} type="button">{saving ? t("rack.saving") : t("details.saveDetails")}</button>
      </div>
    </section>
  );
}

function CurrentAssignments({ canEdit, panel }: { canEdit: boolean; panel: ReturnType<typeof useSlotAssignPanel> }) {
  const { t } = useTranslation("warehouses");
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{t("slotAssign.currentAssignment")}</h3>
      <div className="space-y-2">
        {panel.assignments.map((assignment) => (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4" key={assignment.id}>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {assignment.containerType === "box" ? <Boxes className="text-emerald-300" size={15} /> : <Package className="text-emerald-300" size={15} />}
                <p className="truncate font-semibold text-emerald-100">{assignment.stockBalance.itemName}</p>
                <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[10px] uppercase text-emerald-200">{assignment.containerType}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {assignment.stockBalance.quantity} {assignment.stockBalance.unit}
                {assignment.stockBalance.inventoryTable ? ` | ${assignment.stockBalance.inventoryTable.name}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">{placementText(assignment.stockBalance.location?.code, assignment.fackNumber ?? assignment.stockBalance.compartment, t)}</p>
            </div>
            {canEdit ? (
              <button className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 px-3 py-2 text-sm text-red-200 hover:bg-red-500/10" disabled={panel.isSaving} onClick={() => void panel.unassign(assignment.id)} type="button">
                <Link2Off size={14} /> {t("slotAssign.unassign")}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function AssignMethods({ container, method, panel, setContainer, setMethod, setQrOpen }: {
  container: "pallet" | "box";
  method: "select" | "qr";
  panel: ReturnType<typeof useSlotAssignPanel>;
  setContainer: (value: "pallet" | "box") => void;
  setMethod: (method: "select" | "qr") => void;
  setQrOpen: (open: boolean) => void;
}) {
  const { t } = useTranslation("warehouses");
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{t("slotAssign.assignInventoryRow")}</h3>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase text-slate-500">{t("slotAssign.container")}</span>
        <ToggleButton active={container === "pallet"} icon={<Package size={14} />} label={t("slotAssign.pallet")} onClick={() => setContainer("pallet")} />
        <ToggleButton active={container === "box"} icon={<Boxes size={14} />} label={t("slotAssign.box")} onClick={() => setContainer("box")} />
      </div>
      <div className="mb-3 grid gap-2 md:grid-cols-2">
        <MethodButton active={method === "select"} icon={<Table2 size={15} />} label={t("slotAssign.selectFromTable")} onClick={() => setMethod("select")} />
        <MethodButton active={method === "qr"} icon={<QrCode size={15} />} label={t("slotAssign.scanItemQr")} onClick={() => { setMethod("qr"); setQrOpen(true); }} />
      </div>
      {method === "select" ? <SearchBox panel={panel} /> : (
        <button className="inline-flex items-center gap-2 rounded-md border border-accent/40 px-3 py-2 text-sm font-semibold text-accent hover:border-accent" onClick={() => setQrOpen(true)} type="button">
          <QrCode size={15} /> {t("slotAssign.openQrScanner")}
        </button>
      )}
      {panel.isLoading ? <div className="mt-3 h-12 animate-pulse rounded-md border border-line bg-white/5" /> : null}
      <SearchResults container={container} panel={panel} />
    </section>
  );
}

function SearchBox({ panel }: { panel: ReturnType<typeof useSlotAssignPanel> }) {
  const { t } = useTranslation("warehouses");
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
      <input
        className="w-full rounded-md border border-line bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"
        onChange={(event) => void panel.search(event.target.value)}
        placeholder={t("slotAssign.searchPlaceholder")}
        value={panel.searchQuery}
      />
    </div>
  );
}

function SearchResults({ container, panel }: { container: "pallet" | "box"; panel: ReturnType<typeof useSlotAssignPanel> }) {
  const { t } = useTranslation("warehouses");
  if (!panel.isLoading && panel.searchRows.length === 0) {
    return <p className="mt-3 rounded-md border border-dashed border-line p-4 text-center text-sm text-slate-400">{t("slotAssign.noLinkedRows")}</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      {panel.searchRows.map((row) => (
        <InventoryRowOption
          key={row.id}
          onAssign={() => void panel.assign({ stockBalanceId: row.id, inventoryTableId: row.tableId ?? undefined, containerType: container })}
          row={row}
          saving={panel.isSaving}
        />
      ))}
    </div>
  );
}

function InventoryRowOption({ onAssign, row, saving }: { onAssign: () => void; row: AssignableInventoryRow; saving: boolean }) {
  const { t } = useTranslation("warehouses");
  const currentPlacement = row.currentWarehousePlacement;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white/[0.03] p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{row.itemName}</p>
        <p className="text-xs text-slate-400">{[row.manufacturer, row.articleNumber, row.tableName].filter(Boolean).join(" | ")}</p>
        <p className="text-xs text-slate-500">{placementText(row.locationCode, row.compartment, t)} | {row.quantity} {row.unit}</p>
        {currentPlacement ? (
          <p className="mt-1 text-xs text-amber-300">
            {t("slotAssign.currentlyIn", { warehouseName: currentPlacement.warehouseName })}
            {currentPlacement.slotIndex ? ` ${t("slotAssign.currentlyInSlot", { index: currentPlacement.slotIndex })}` : ""}
          </p>
        ) : null}
      </div>
      <button className="shrink-0 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} onClick={onAssign} type="button">
        {currentPlacement ? t("slotAssign.moveHere") : t("slotAssign.assign")}
      </button>
    </div>
  );
}

function ToggleButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold ${active ? "border-accent bg-accent/15 text-accent" : "border-line bg-white/[0.03] text-slate-300"}`} onClick={onClick} type="button">{icon} {label}</button>;
}

function MethodButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${active ? "border-accent bg-accent/15 text-accent" : "border-line bg-white/[0.03] text-slate-300"}`} onClick={onClick} type="button">{icon} {label}</button>;
}

function placementText(locationCode: string | null | undefined, compartment: string | null | undefined, t: (key: string, opts?: Record<string, unknown>) => string) {
  const loc = locationCode ?? t("slotMap.placementUnassigned");
  return `${t("slotAssign.placementPrefix")}${loc}${compartment ? ` / FACK ${compartment}` : ""}`;
}

function physicalSlotLabel(slotIndex: number | null | undefined, t: (key: string, opts?: Record<string, unknown>) => string) {
  return slotIndex ? t("slotMap.physicalSlot", { index: slotIndex }) : t("slotMap.physicalWarehouseSlot");
}
