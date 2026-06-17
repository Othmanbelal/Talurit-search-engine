import type React from "react";
import { ArrowLeft, Archive, Boxes, Link2, Map, Pencil, RotateCcw, Trash2, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { InlineManagerStrip } from "../components/InlineManagerStrip";
import { WarehouseDetailsPanel } from "../components/warehouses/WarehouseDetailsPanel";
import { WarehouseInventoryLinksPanel } from "../components/warehouses/WarehouseInventoryLinksPanel";
import { WarehouseRackConfigPanel } from "../components/warehouses/WarehouseRackConfigPanel";
import { WarehouseShelvesPanel } from "../components/warehouses/WarehouseShelvesPanel";
import { WarehouseSlotMapPanel } from "../components/warehouses/WarehouseSlotMapPanel";
import { WarehouseViewerPanel } from "../components/warehouses/WarehouseViewerPanel";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";
import { useWarehouse } from "../hooks/useWarehouses";

type Tab = "shelves" | "map" | "inventory";

export function WarehouseDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  useAuth();
  const warehouse = useWarehouse(id);
  const [activeTab, setActiveTab] = useState<Tab>("shelves");
  const [mapKey, setMapKey] = useState(0);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [reloadSignal, setReloadSignal] = useState(0);
  const { canManageWarehouses } = usePermissions();
  const canEdit = canManageWarehouses;
  const canArchive = canManageWarehouses;
  const canDelete = canManageWarehouses;
  const focusSlotId = searchParams.get("slot");

  useEffect(() => {
    if (!focusSlotId) return;
    const timer = setTimeout(() => document.getElementById("warehouse-3d-view")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    return () => clearTimeout(timer);
  }, [focusSlotId]);

  function handleTabChange(tab: Tab) {
    if (tab === "map") setMapKey((k) => k + 1);
    setActiveTab(tab);
  }

  function handleRackSelect(rackId: string) {
    if (!canEdit) return;
    setSelectedRackId(rackId);
  }

  function handleSaved() {
    setReloadSignal((n) => n + 1);
  }

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-7xl">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to="/warehouses">
          <ArrowLeft size={16} /> Warehouses
        </Link>
      </div>
      {warehouse.error ? <ErrorMessage message={warehouse.error} /> : null}
      {warehouse.isLoading ? <Loading /> : null}
      {warehouse.warehouse ? (
        <div className="mx-auto max-w-7xl space-y-5">
          <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Warehouse layout</p>
              <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{warehouse.warehouse.name}</h1>
              <p className="mt-2 text-sm text-slate-400">{warehouse.warehouse.description || "No description recorded."}</p>
              <div className="mt-3">
                <InlineManagerStrip canEdit={canEdit} resourceId={warehouse.warehouse.id} resourceType="warehouse" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canEdit ? (
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-accent/40 px-3 py-2 text-sm font-semibold text-accent hover:border-accent"
                  onClick={() => navigate(`/warehouses/${warehouse.warehouse!.id}/design`)}
                  type="button"
                >
                  <Pencil size={16} /> Edit design
                </button>
              ) : null}
              {canArchive ? (
                <ArchiveButton
                  archived={warehouse.warehouse.isArchived}
                  onArchive={warehouse.archive}
                  onRestore={warehouse.restore}
                />
              ) : null}
              {canDelete ? (
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 hover:border-red-400"
                  onClick={() => {
                    if (window.confirm(`Permanently delete "${warehouse.warehouse!.name}"? This cannot be undone.`)) {
                      void warehouse.remove().then(() => navigate("/warehouses"));
                    }
                  }}
                  type="button"
                >
                  <Trash2 size={16} /> Delete
                </button>
              ) : null}
            </div>
          </header>
          <WarehouseStats warehouse={warehouse.warehouse} />
          {canEdit ? <WarehouseDetailsPanel onUpdate={warehouse.update} warehouse={warehouse.warehouse} /> : null}
          <TabBar activeTab={activeTab} onSelect={handleTabChange} />
          {activeTab === "shelves" ? (
            <WarehouseShelvesPanel
              canEdit={canEdit}
              onRackSelect={handleRackSelect}
              selectedRackId={selectedRackId}
              warehouse={warehouse.warehouse}
            />
          ) : null}
          {activeTab === "map" ? <WarehouseSlotMapPanel canEdit={canEdit} key={mapKey} warehouseId={warehouse.warehouse.id} /> : null}
          {activeTab === "inventory" ? <WarehouseInventoryLinksPanel canEdit={canEdit} warehouseId={warehouse.warehouse.id} /> : null}
          <WarehouseViewerPanel
            onRackSelect={canEdit ? handleRackSelect : undefined}
            focusSlotId={focusSlotId}
            reloadSignal={reloadSignal}
            warehouse={warehouse.warehouse}
          />
        </div>
      ) : null}

      {selectedRackId && warehouse.warehouse ? (
        <WarehouseRackConfigPanel
          onClose={() => setSelectedRackId(null)}
          onSaved={handleSaved}
          selectedRackId={selectedRackId}
          warehouseId={warehouse.warehouse.id}
        />
      ) : null}
    </div>
  );
}

function TabBar({ activeTab, onSelect }: { activeTab: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <nav className="flex gap-1 rounded-lg border border-line bg-white/[0.03] p-1">
      <TabButton active={activeTab === "shelves"} icon={<Boxes size={15} />} label="Shelves" onClick={() => onSelect("shelves")} />
      <TabButton active={activeTab === "map"} icon={<Map size={15} />} label="Slot map" onClick={() => onSelect("map")} />
      <TabButton active={activeTab === "inventory"} icon={<Link2 size={15} />} label="Linked inventory" onClick={() => onSelect("inventory")} />
    </nav>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${active ? "bg-accent text-slate-950" : "text-slate-300 hover:text-white"}`}
      onClick={onClick}
      type="button"
    >
      {icon} {label}
    </button>
  );
}

function ArchiveButton({ archived, onArchive, onRestore }: { archived: boolean; onArchive: () => Promise<void>; onRestore: () => Promise<void> }) {
  if (archived) {
    return <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200" onClick={() => void onRestore()} type="button"><RotateCcw size={16} /> Restore</button>;
  }
  return <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200" onClick={() => window.confirm("Archive this warehouse layout?") && void onArchive()} type="button"><Archive size={16} /> Archive</button>;
}

function WarehouseStats({ warehouse }: { warehouse: { counts: { objects: number; shelves: number; slots: number; assignments: number }; version: number } }) {
  return (
    <section className="grid gap-3 md:grid-cols-5">
      <Metric icon={<Warehouse size={16} />} label="Objects" value={warehouse.counts.objects} />
      <Metric icon={<Boxes size={16} />} label="Shelves" value={warehouse.counts.shelves} />
      <Metric label="Slots" value={warehouse.counts.slots} />
      <Metric label="Assigned" value={warehouse.counts.assignments} />
      <Metric label="Version" value={warehouse.version} />
    </section>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) {
  return <div className="rounded-lg border border-line bg-white/[0.04] p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-400">{icon}{label}</div><div className="mt-2 text-2xl font-semibold text-white">{value}</div></div>;
}

function ErrorMessage({ message }: { message: string }) {
  return <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{message}</section>;
}

function Loading() {
  return <div className="h-64 animate-pulse rounded-lg border border-line bg-white/5" />;
}
