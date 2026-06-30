import { Grid, Link2Off, Plus, Table2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWarehouseLinks } from "../../hooks/useWarehouseLinks";
import type { WarehouseGroupLink, WarehouseTableLink } from "../../types/warehouse";

type Props = {
  canEdit: boolean;
  warehouseId: string;
};

export function WarehouseInventoryLinksPanel({ canEdit, warehouseId }: Props) {
  const { t } = useTranslation("warehouses");
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
          <h2 className="text-lg font-semibold text-white">{t("inventoryLinks.title")}</h2>
          <p className="text-sm text-slate-400">{t("inventoryLinks.description")}</p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button className={buttonClass(addMode === "group")} onClick={() => { setAddMode(addMode === "group" ? null : "group"); setSelectedId(""); }} type="button">
              <Plus size={15} /> {t("inventoryLinks.group")}
            </button>
            <button className={buttonClass(addMode === "table")} onClick={() => { setAddMode(addMode === "table" ? null : "table"); setSelectedId(""); }} type="button">
              <Plus size={15} /> {t("inventoryLinks.table")}
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
            <option value="">{addMode === "group" ? t("inventoryLinks.selectGroup") : t("inventoryLinks.selectTable")}</option>
            {addMode === "group" && availableGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            {addMode === "table" && availableTables.map((t2) => <option key={t2.id} value={t2.id}>{t2.name}</option>)}
          </select>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={!selectedId} onClick={handleAdd} type="button">
            {t("inventoryLinks.link")}
          </button>
          <button className="rounded-md border border-line px-3 py-2 text-sm text-slate-300" onClick={() => { setAddMode(null); setSelectedId(""); }} type="button">{t("inventoryLinks.cancel")}</button>
        </div>
      ) : null}

      {links.links.groupLinks.length === 0 && links.links.tableLinks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-slate-400">{t("inventoryLinks.noLinked")}</p>
      ) : null}

      {links.links.groupLinks.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("inventoryLinks.inventoryGroups")}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {links.links.groupLinks.map((link) => <GroupLinkCard canEdit={canEdit} key={link.id} link={link} onRemove={() => links.removeGroupLink(link.groupId)} />)}
          </div>
        </div>
      ) : null}

      {links.links.tableLinks.length > 0 ? (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t("inventoryLinks.inventoryTables")}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {links.links.tableLinks.map((link) => <TableLinkCard canEdit={canEdit} key={link.id} link={link} onRemove={() => links.removeTableLink(link.tableId)} />)}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function GroupLinkCard({ canEdit, link, onRemove }: { canEdit: boolean; link: WarehouseGroupLink; onRemove: () => void }) {
  const { t } = useTranslation("warehouses");
  return (
    <article className="flex items-center justify-between gap-3 rounded-md border border-line bg-white/[0.03] px-3 py-3">
      <div className="flex items-center gap-2">
        <Grid className="shrink-0 text-accent" size={15} />
        <div>
          <p className="text-sm font-semibold text-white">{link.name}</p>
          <p className="text-xs text-slate-400">{t("inventoryLinks.tables", { count: link.tableCount })}</p>
        </div>
      </div>
      {canEdit ? (
        <button className="rounded-md border border-red-400/30 p-1.5 text-red-200 hover:bg-red-500/10" onClick={() => window.confirm(t("inventoryLinks.unlinkGroup", { name: link.name })) && onRemove()} title={t("inventoryLinks.removeGroupLink")} type="button">
          <Link2Off size={14} />
        </button>
      ) : null}
    </article>
  );
}

function TableLinkCard({ canEdit, link, onRemove }: { canEdit: boolean; link: WarehouseTableLink; onRemove: () => void }) {
  const { t } = useTranslation("warehouses");
  return (
    <article className="flex items-center justify-between gap-3 rounded-md border border-line bg-white/[0.03] px-3 py-3">
      <div className="flex items-center gap-2">
        <Table2 className="shrink-0 text-accent" size={15} />
        <p className="text-sm font-semibold text-white">{link.name}</p>
      </div>
      {canEdit ? (
        <button className="rounded-md border border-red-400/30 p-1.5 text-red-200 hover:bg-red-500/10" onClick={() => window.confirm(t("inventoryLinks.unlinkTable", { name: link.name })) && onRemove()} title={t("inventoryLinks.removeTableLink")} type="button">
          <Link2Off size={14} />
        </button>
      ) : null}
    </article>
  );
}

function buttonClass(active: boolean) {
  return `inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${active ? "border-accent bg-accent text-slate-950" : "border-line text-slate-200 hover:border-accent"}`;
}
