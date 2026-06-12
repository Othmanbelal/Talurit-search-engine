import { Grid, Link2Off, Plus, Table2 } from "lucide-react";
import { useState } from "react";
import { useWarehouseLinks } from "../../hooks/useWarehouseLinks";
import type { WarehouseGroupLink, WarehouseTableLink } from "../../types/warehouse";

type Props = {
  canEdit: boolean;
  warehouseId: string;
};

export function WarehouseInventoryLinksPanel({ canEdit, warehouseId }: Props) {
  const links = useWarehouseLinks(warehouseId);
  const [addMode, setAddMode] = useState<"group" | "table" | null>(null);
  const [selectedId, setSelectedId] = useState("");

  if (links.isLoading) return <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />;

  async function handleAdd() {
    if (!selectedId) return;
    if (addMode === "group") await links.addGroupLink(selectedId);
    if (addMode === "table") await links.addTableLink(selectedId);
    setSelectedId("");
    setAddMode(null);
  }

  const availableGroups = links.available.groups;
  const availableTables = links.available.tables;

  return (
    <section className="space-y-4 rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Linked inventory</h2>
          <p className="text-sm text-slate-400">Link inventory groups or tables to search and assign stock rows to slots in this warehouse.</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass(addMode === "group")} onClick={() => { setAddMode(addMode === "group" ? null : "group"); setSelectedId(""); }} type="button">
              <Plus size={15} /> Group
            </button>
            <button className={buttonClass(addMode === "table")} onClick={() => { setAddMode(addMode === "table" ? null : "table"); setSelectedId(""); }} type="button">
              <Plus size={15} /> Table
            </button>
          </div>
        ) : null}
      </div>

      {links.error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{links.error}</p> : null}

      {addMode ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
          <select
            className="flex-1 rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white"
            onChange={(event) => setSelectedId(event.target.value)}
            value={selectedId}
          >
            <option value="">— select {addMode} —</option>
            {addMode === "group" && availableGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            {addMode === "table" && availableTables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={!selectedId} onClick={handleAdd} type="button">
            Link
          </button>
          <button className="rounded-md border border-line px-3 py-2 text-sm text-slate-300" onClick={() => { setAddMode(null); setSelectedId(""); }} type="button">Cancel</button>
        </div>
      ) : null}

      {links.links.groupLinks.length === 0 && links.links.tableLinks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-slate-400">No inventory linked yet. Add a group or table to enable slot assignment.</p>
      ) : null}

      {links.links.groupLinks.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Inventory groups</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {links.links.groupLinks.map((link) => <GroupLinkCard canEdit={canEdit} key={link.id} link={link} onRemove={() => links.removeGroupLink(link.groupId)} />)}
          </div>
        </div>
      ) : null}

      {links.links.tableLinks.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Inventory tables</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {links.links.tableLinks.map((link) => <TableLinkCard canEdit={canEdit} key={link.id} link={link} onRemove={() => links.removeTableLink(link.tableId)} />)}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GroupLinkCard({ canEdit, link, onRemove }: { canEdit: boolean; link: WarehouseGroupLink; onRemove: () => void }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-md border border-line bg-white/[0.03] px-3 py-3">
      <div className="flex items-center gap-2">
        <Grid className="shrink-0 text-accent" size={15} />
        <div>
          <p className="text-sm font-semibold text-white">{link.name}</p>
          <p className="text-xs text-slate-400">{link.tableCount} tables</p>
        </div>
      </div>
      {canEdit ? (
        <button className="rounded-md border border-red-400/30 p-1.5 text-red-200 hover:bg-red-500/10" onClick={() => window.confirm(`Unlink group "${link.name}"?`) && onRemove()} title="Remove group link" type="button">
          <Link2Off size={14} />
        </button>
      ) : null}
    </article>
  );
}

function TableLinkCard({ canEdit, link, onRemove }: { canEdit: boolean; link: WarehouseTableLink; onRemove: () => void }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-md border border-line bg-white/[0.03] px-3 py-3">
      <div className="flex items-center gap-2">
        <Table2 className="shrink-0 text-accent" size={15} />
        <p className="text-sm font-semibold text-white">{link.name}</p>
      </div>
      {canEdit ? (
        <button className="rounded-md border border-red-400/30 p-1.5 text-red-200 hover:bg-red-500/10" onClick={() => window.confirm(`Unlink table "${link.name}"?`) && onRemove()} title="Remove table link" type="button">
          <Link2Off size={14} />
        </button>
      ) : null}
    </article>
  );
}

function buttonClass(active: boolean) {
  return `inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${active ? "border-accent bg-accent text-slate-950" : "border-line text-slate-200 hover:border-accent"}`;
}

