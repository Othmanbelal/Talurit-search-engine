import { ArrowLeft, Plus, Settings2, Trash2 } from "lucide-react";
import { InlineManagerStrip } from "../components/InlineManagerStrip";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DuplicateReviewPanel } from "../components/structured-inventory/DuplicateReviewPanel";
import { attributeColumnKey } from "../components/structured-inventory/StructuredStockRowsTable";
import { StockRowAddDrawer } from "../components/structured-inventory/StockRowAddDrawer";
import { StockRowDetailsDrawer } from "../components/structured-inventory/StockRowDetailsDrawer";
import { StockRowMovementModal } from "../components/structured-inventory/StockRowMovementModal";
import { StructuredStockRowsTable } from "../components/structured-inventory/StructuredStockRowsTable";
import { StructuredTableSearchFilters } from "../components/structured-inventory/StructuredTableSearchFilters";
import { TableColumnSettingsPanel } from "../components/structured-inventory/TableColumnSettingsPanel";
import { TableWidgets } from "../components/structured-inventory/TableWidgets";
import { useMyResourceManagers } from "../hooks/useMyResourceManagers";
import { usePermissions } from "../hooks/usePermissions";
import { useStructuredInventoryTable } from "../hooks/useStructuredInventory";
import type { AddStockRowInput, StructuredStockRow, StructuredTableFilters } from "../types/structured-inventory";

export function StructuredInventoryTablePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canManageInventory, canTakeReturn } = usePermissions();
  const { isResourceManager } = useMyResourceManagers();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<StructuredTableFilters>({});
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLayoutOpen, setIsLayoutOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StructuredStockRow | null>(null);
  const [movingRow, setMovingRow] = useState<StructuredStockRow | null>(null);
  const [movementVersion, setMovementVersion] = useState(0);
  const highlightedRowId = searchParams.get("highlight");
  const initialSearch = searchParams.get("search") ?? "";
  const inventory = useStructuredInventoryTable(id);
  const groupId = inventory.table?.group?.id ?? null;
  const canManageThisTable = canManageInventory
    || isResourceManager("inventory_table", id ?? "")
    || (!!groupId && isResourceManager("inventory_group", groupId));
  const allowedSearchAttributes = inventory.table?.columnSettings.allowedSearchAttributes ?? null;

  // Keep the open detail drawer in sync with the latest table data.
  useEffect(() => {
    if (!selectedRow || !inventory.rows) return;
    const fresh = inventory.rows.items.find((r) => r.id === selectedRow.id);
    if (fresh && fresh !== selectedRow) setSelectedRow(fresh);
  }, [inventory.rows, selectedRow]);

  useEffect(() => {
    if (!initialSearch) return;
    setSearch(initialSearch);
    inventory.loadRows(initialSearch, inventory.archived, filters, 1);
    // Run once for scan/deep links; normal search state is handled by the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  useEffect(() => {
    if (!highlightedRowId || !inventory.rows) return;
    // Wait one tick for the DOM to render the rows before scrolling.
    const timer = setTimeout(() => {
      document.getElementById(`row-${highlightedRowId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
    return () => clearTimeout(timer);
  }, [highlightedRowId, inventory.rows]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    inventory.loadRows(search, inventory.archived, filters, 1);
  }

  function resetFilters() {
    setSearch("");
    setFilters({});
    inventory.loadRows("", inventory.archived, {}, 1);
  }

  async function saveAllowedAttributes(allowed: string[] | null) {
    if (!inventory.table) return;
    const cs = inventory.table.columnSettings;
    await inventory.updateColumns({ ...cs, allowedSearchAttributes: allowed });
  }

  async function deleteTable() {
    if (!window.confirm("Remove this table and its table rows?")) return;
    await inventory.deleteTable();
    navigate(inventory.table?.group ? `/inventory/groups/${inventory.table.group.id}` : "/inventory");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to={inventory.table?.group ? `/inventory/groups/${inventory.table.group.id}` : "/inventory"}>
        <ArrowLeft size={16} /> {inventory.table?.group?.name ?? "Inventory"}
      </Link>
      {inventory.error ? <ErrorMessage message={inventory.error} /> : null}
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Inventory table</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{inventory.table?.name ?? "Inventory table"}</h1>
          <p className="mt-2 text-sm text-slate-400">{inventory.table?.sourceSheetName ?? inventory.table?.tableType ?? "Structured stock rows"}</p>
          {inventory.table && (
            <div className="mt-3">
              <InlineManagerStrip
                canEdit={canManageInventory}
                groupId={inventory.table.group?.id ?? null}
                resourceId={inventory.table.id}
                resourceType="inventory_table"
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageInventory ? (
            <>
              <button className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${isLayoutOpen ? "border-accent bg-accent/15 text-accent" : "border-line bg-white/5 text-slate-200"}`} onClick={() => setIsLayoutOpen((current) => !current)} type="button">
                <Settings2 size={16} /> Table layout
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" onClick={() => setIsAddOpen(true)} type="button">
                <Plus size={16} /> Add item
              </button>
              <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-400/40 bg-red-500/10 text-red-100" onClick={deleteTable} title="Remove table" type="button">
                <Trash2 size={16} />
              </button>
            </>
          ) : null}
        </div>
      </header>
      <StructuredTableSearchFilters
        allowedSearchAttributes={canManageThisTable ? null : allowedSearchAttributes}
        canManage={canManageThisTable}
        filters={filters}
        options={inventory.rows?.filterOptions ?? { itemNames: [], manufacturers: [], categories: [], attributes: [] }}
        onFilters={setFilters}
        onReset={resetFilters}
        onSaveAllowedAttributes={canManageThisTable ? saveAllowedAttributes : undefined}
        onSearch={submitSearch}
        search={search}
        setSearch={setSearch}
      />
      <ArchiveModeControls active={inventory.archived} onChange={(mode) => inventory.loadRows(search, mode, filters, 1)} />
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">
        <TableWidgets rows={inventory.rows} table={inventory.table} />
        {inventory.rows && canManageThisTable ? (
          <DuplicateReviewPanel
            canEdit={canManageThisTable}
            duplicateGroups={inventory.rows.stats.duplicateGroups}
            duplicateRows={inventory.rows.stats.duplicateRows}
            onChanged={() => inventory.loadRows(search, inventory.archived, filters, inventory.rows?.page ?? 1)}
            table={inventory.table}
            tableId={id}
          />
        ) : null}
      </div>
      {isLayoutOpen ? (
        <TableColumnSettingsPanel onClose={() => setIsLayoutOpen(false)} onSave={inventory.updateColumns} table={inventory.table} />
      ) : null}
      {inventory.isLoading ? <div className="h-64 animate-pulse rounded-lg border border-line bg-white/5" /> : null}
      {inventory.rows ? (
        <>
          <StructuredStockRowsTable
            highlightedRowId={highlightedRowId}
            rows={inventory.rows.items}
            table={inventory.table}
            onArchive={canManageInventory ? (row) => void inventory.archiveRow(row.id) : undefined}
            onDelete={canManageInventory ? (row) => window.confirm("Remove this item from this table?") && void inventory.deleteRow(row.id) : undefined}
            onMove={canTakeReturn ? setMovingRow : undefined}
            onOpen={setSelectedRow}
            onRestore={canManageInventory ? (row) => void inventory.restoreRow(row.id) : undefined}
          />
          <TablePagination rows={inventory.rows} onPage={(page) => inventory.loadRows(search, inventory.archived, filters, page)} />
        </>
      ) : null}
      <StockRowDetailsDrawer
        historyKey={movementVersion}
        row={selectedRow}
        tableId={id}
        tableName={inventory.table?.name}
        onClose={() => setSelectedRow(null)}
        onSave={async (rowId, input) => {
          await inventory.updateRow(rowId, input);
          setSelectedRow(null);
        }}
      />
      <StockRowMovementModal
        row={movingRow}
        onClose={() => setMovingRow(null)}
        onTake={async (rowId, input) => {
          await inventory.takeRow(rowId, input);
          setMovementVersion((v) => v + 1);
        }}
        onUseIn={async (rowId, input) => {
          await inventory.useRowInCard(rowId, input);
          setMovementVersion((v) => v + 1);
        }}
      />
      {canManageInventory ? <StockRowAddDrawer isOpen={isAddOpen} onAddRow={addRowWithColumns} onClose={() => setIsAddOpen(false)} /> : null}
    </div>
  );

  async function addRowWithColumns(input: AddStockRowInput) {
    await inventory.addRow(input);
    const newColumns = input.attributes.map((attribute) => ({
      key: attributeColumnKey(attribute.name),
      name: attribute.name,
      label: attribute.name,
    }));
    if (!inventory.table || newColumns.length === 0) return;
    const existing = inventory.table.columnSettings.customColumns;
    const customColumns = [...existing];
    for (const column of newColumns) {
      if (!customColumns.some((current) => current.key === column.key)) customColumns.push(column);
    }
    await inventory.updateColumns({
      ...inventory.table.columnSettings,
      customColumns,
      visibleColumns: Array.from(new Set([...inventory.table.columnSettings.visibleColumns, ...newColumns.map((column) => column.key)])),
    });
  }
}

function ArchiveModeControls({ active, onChange }: {
  active: "active" | "archived" | "all";
  onChange: (mode: "active" | "archived" | "all") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["active", "archived", "all"] as const).map((mode) => (
        <button className={`rounded-md border px-3 py-2 text-sm font-semibold ${active === mode ? "border-accent bg-accent/15 text-accent" : "border-line bg-white/5 text-slate-300"}`} key={mode} onClick={() => onChange(mode)} type="button">
          {mode === "active" ? "Current" : mode === "archived" ? "Archived" : "All"}
        </button>
      ))}
    </div>
  );
}

function TablePagination({ onPage, rows }: {
  onPage: (page: number) => void;
  rows: { page: number; pageSize: number; total: number; totalPages: number };
}) {
  const start = rows.total === 0 ? 0 : (rows.page - 1) * rows.pageSize + 1;
  const end = Math.min(rows.page * rows.pageSize, rows.total);
  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-white/[0.04] p-3 text-sm text-slate-300 md:flex-row md:items-center">
      <span>Showing {start}-{end} of {rows.total}</span>
      <div className="flex gap-2">
        <button className="rounded-md border border-line px-3 py-2 font-semibold disabled:opacity-40" disabled={rows.page <= 1} onClick={() => onPage(rows.page - 1)} type="button">Previous</button>
        <span className="rounded-md border border-line bg-slate-950/70 px-3 py-2">Page {rows.page} / {Math.max(rows.totalPages, 1)}</span>
        <button className="rounded-md border border-line px-3 py-2 font-semibold disabled:opacity-40" disabled={rows.page >= rows.totalPages} onClick={() => onPage(rows.page + 1)} type="button">Next</button>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{message}</section>;
}
