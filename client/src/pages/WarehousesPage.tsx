import { Pencil, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { WarehouseArchiveControls } from "../components/warehouses/WarehouseArchiveControls";
import { WarehouseCard } from "../components/warehouses/WarehouseCard";
import { usePermissions } from "../hooks/usePermissions";
import { useWarehouses } from "../hooks/useWarehouses";

export function WarehousesPage() {
  const { t } = useTranslation("warehouses");
  const warehouses = useWarehouses();
  const { canManageWarehouses } = usePermissions();
  const canCreate = canManageWarehouses;
  const canArchive = canManageWarehouses;
  const canDelete = canManageWarehouses;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("sectionLabel")}</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("title")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            {t("subtitle")}
          </p>
        </div>
        {canCreate ? (
          <Link
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 hover:opacity-90"
            to="/warehouses/new"
          >
            <Pencil size={16} /> {t("designNew")}
          </Link>
        ) : null}
      </header>

      <WarehouseArchiveControls active={warehouses.archiveMode} onChange={warehouses.load} />
      {warehouses.error ? <ErrorMessage message={warehouses.error} /> : null}
      {warehouses.isLoading ? <LoadingCards /> : null}
      {!warehouses.isLoading && warehouses.warehouses.length === 0 ? <EmptyState /> : null}

      {!warehouses.isLoading && warehouses.warehouses.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {warehouses.warehouses.map((warehouse) => (
            <WarehouseCard
              key={warehouse.id}
              warehouse={warehouse}
              onArchive={(target) => canArchive && window.confirm(t("confirmArchive")) && void warehouses.archive(target.id)}
              onDelete={(target) => canDelete && window.confirm(t("confirmDelete", { name: target.name })) && void warehouses.remove(target.id)}
              onRestore={(target) => canArchive && void warehouses.restore(target.id)}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation("warehouses");
  return (
    <section className="rounded-lg border border-line bg-panel p-8 text-center">
      <Warehouse className="mx-auto text-accent" size={32} />
      <h2 className="mt-4 text-xl font-semibold text-white">{t("empty.title")}</h2>
      <p className="mt-2 text-sm text-slate-400">{t("empty.description")}</p>
    </section>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{message}</section>;
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="h-48 animate-pulse rounded-lg border border-line bg-white/5" key={index} />
      ))}
    </div>
  );
}
