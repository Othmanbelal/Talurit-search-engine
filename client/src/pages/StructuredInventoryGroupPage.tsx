import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { InlineManagerStrip } from "../components/InlineManagerStrip";
import { InventoryStats } from "../components/structured-inventory/InventoryStats";
import { InventoryTableCard } from "../components/structured-inventory/InventoryTableCard";
import { TableCreatePanel } from "../components/structured-inventory/TableCreatePanel";
import { usePermissions } from "../hooks/usePermissions";
import { useStructuredInventoryGroup } from "../hooks/useStructuredInventory";

export function StructuredInventoryGroupPage() {
  const { id } = useParams();
  const { createTable, deleteTable, error, group, isLoading } = useStructuredInventoryGroup(id);
  const { canManageInventory } = usePermissions();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to="/inventory">
        <ArrowLeft size={16} /> Inventory
      </Link>

      {error ? <ErrorMessage message={error} /> : null}
      {isLoading ? <Loading /> : null}
      {group ? (
        <>
          <header>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Inventory group</p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{group.name}</h1>
            <p className="mt-2 text-sm text-slate-400">Tables inside this group remain separate.</p>
            <div className="mt-3">
              <InlineManagerStrip canEdit={canManageInventory} resourceId={group.id} resourceType="inventory_group" />
            </div>
          </header>
          <InventoryStats items={[{ label: "Tables", value: group.tableCount }, { label: "Rows", value: group.rowCount }]} />
          <TableCreatePanel groupId={group.id} onCreateTable={createTable} />
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.tables.map((table) => (
              <InventoryTableCard
                key={table.id}
                table={table}
                onDelete={(target) => window.confirm("Remove this table and its rows?") && void deleteTable(target.id)}
              />
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{message}</section>;
}

function Loading() {
  return <div className="h-40 animate-pulse rounded-lg border border-line bg-white/5" />;
}
