import { useTranslation } from "react-i18next";
import { InventoryGroupCard } from "../components/structured-inventory/InventoryGroupCard";
import { InventoryCreatePanel } from "../components/structured-inventory/InventoryCreatePanel";
import { InventoryTableCard } from "../components/structured-inventory/InventoryTableCard";
import { StructuredInventoryEmptyState } from "../components/structured-inventory/StructuredInventoryEmptyState";
import { StructuredInventoryHeader } from "../components/structured-inventory/StructuredInventoryHeader";
import { usePermissions } from "../hooks/usePermissions";
import { useStructuredInventoryOverview } from "../hooks/useStructuredInventory";

export function InventoryPage() {
  const { t } = useTranslation("inventory");
  const { createGroup, createTable, deleteGroup, deleteTable, error, isLoading, overview } = useStructuredInventoryOverview();
  const { canManageInventory } = usePermissions();
  const hasInventory = overview.groups.length > 0 || overview.ungroupedTables.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <StructuredInventoryHeader />
      {canManageInventory ? <InventoryCreatePanel onCreateGroup={createGroup} onCreateTable={createTable} /> : null}
      {error ? <ErrorMessage message={error} /> : null}
      {isLoading ? <LoadingCards /> : null}
      {!isLoading && !hasInventory ? <StructuredInventoryEmptyState /> : null}

      {!isLoading && overview.groups.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">{t("groups")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overview.groups.map((group) => (
              <InventoryGroupCard
                group={group}
                key={group.id}
                onDelete={canManageInventory ? (target) => window.confirm(t("confirmRemoveGroup")) && void deleteGroup(target.id) : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && overview.ungroupedTables.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">{t("tables")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overview.ungroupedTables.map((table) => (
              <InventoryTableCard
                key={table.id}
                table={table}
                onDelete={canManageInventory ? (target) => window.confirm(t("confirmRemoveTable")) && void deleteTable(target.id) : undefined}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{message}</section>;
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="h-44 animate-pulse rounded-lg border border-line bg-white/5" key={index} />
      ))}
    </div>
  );
}
