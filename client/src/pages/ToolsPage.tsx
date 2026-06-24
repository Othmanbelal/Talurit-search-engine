import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown } from "lucide-react";
import { ToolDetailsDrawer } from "../components/tools/ToolDetailsDrawer";
import { ToolFormModal } from "../components/tools/ToolFormModal";
import { ToolsPagination } from "../components/tools/ToolsPagination";
import { ToolsTable } from "../components/tools/ToolsTable";
import { ToolsToolbar } from "../components/tools/ToolsToolbar";
import { useAuth } from "../hooks/useAuth";
import { useExcelExport } from "../hooks/useExcelExport";
import { useToolMetadata } from "../hooks/useToolMetadata";
import { useTools } from "../hooks/useTools";
import type { Tool, ToolFilters, ToolPayload, ToolPlacementPayload } from "../types/tools";

const defaultFilters: ToolFilters = {
  q: "",
  toolTypeId: "",
  manufacturerId: "",
  locationId: "",
  machineId: "",
  placement: "all",
  status: "",
  archived: "false",
  sortBy: "updatedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 25,
};

export function ToolsPage() {
  const { t } = useTranslation("tools");
  const { user } = useAuth();
  const [filters, setFilters] = useState<ToolFilters>(defaultFilters);
  const [detailsTool, setDetailsTool] = useState<Tool | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const metadata = useToolMetadata();
  const tools = useTools(useMemo(() => filters, [filters]));
  const excelExport = useExcelExport();

  const canEdit = user?.role === "admin" || user?.role === "manager";
  const canDelete = user?.role === "admin";
  const canExport = user?.role === "admin" || user?.role === "manager";

  function updateFilters(update: Partial<ToolFilters>) {
    setFilters((current) => ({ ...current, ...update }));
  }

  function handleSort(sortBy: ToolFilters["sortBy"]) {
    setFilters((current) => ({
      ...current,
      sortBy,
      sortDirection:
        current.sortBy === sortBy && current.sortDirection === "asc" ? "desc" : "asc",
      page: 1,
    }));
  }

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);

    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t("actionFailed"));
    }
  }

  async function handleCreate(payload: ToolPayload) {
    await tools.createTool(payload);
  }

  async function handleUpdate(payload: ToolPayload) {
    if (!editingTool) return;
    await tools.updateTool(editingTool, payload);
    setEditingTool(null);
  }

  async function handleMove(tool: Tool, payload: ToolPlacementPayload) {
    const updated = await tools.updatePlacement(tool, payload);
    setDetailsTool(updated);
    return updated;
  }

  async function handleMoveToMachine(tool: Tool, machineId: string, quantity: number) {
    const updated = await tools.linkToMachine(tool, machineId, quantity);
    setDetailsTool(updated);
    return updated;
  }

  const rows = tools.data?.items ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            {t("sectionLabel")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("title")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canExport ? (
            <button
              className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-4 py-3 text-sm text-slate-200 hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={excelExport.isExporting}
              onClick={() => void runAction(() => excelExport.exportInventory(filters))}
              type="button"
            >
              <FileDown size={17} /> {excelExport.isExporting ? t("export.exporting") : t("export.label")}
            </button>
          ) : null}
          <div className="rounded-lg border border-line bg-white/5 px-4 py-3 text-sm text-slate-300">
            {tools.data ? t("records", { count: tools.data.total }) : t("loadingRecords")}
          </div>
        </div>
      </header>

      <ToolsToolbar
        canEdit={canEdit}
        filters={filters}
        metadata={metadata.data}
        onAdd={() => setIsCreateOpen(true)}
        onChange={updateFilters}
        onReset={() => setFilters(defaultFilters)}
      />

      {actionError || tools.error || excelExport.error ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {actionError ?? tools.error ?? excelExport.error}
        </section>
      ) : null}

      <ToolsTable
        canDelete={canDelete}
        canEdit={canEdit}
        filters={filters}
        isLoading={tools.isLoading || metadata.isLoading}
        onArchive={(tool) => void runAction(() => tools.archiveTool(tool))}
        onDelete={(tool) => window.confirm(t("confirmRemove")) && void runAction(() => tools.deleteTool(tool))}
        onEdit={setEditingTool}
        onRestore={(tool) => void runAction(() => tools.restoreTool(tool))}
        onSort={handleSort}
        onView={setDetailsTool}
        tools={rows}
      />

      {tools.data ? (
        <ToolsPagination
          onPageChange={(page) => updateFilters({ page })}
          page={tools.data.page}
          pageSize={tools.data.pageSize}
          total={tools.data.total}
          totalPages={tools.data.totalPages}
        />
      ) : null}

      <ToolFormModal
        metadata={metadata.data}
        mode="create"
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        open={isCreateOpen}
        tool={null}
      />

      <ToolFormModal
        metadata={metadata.data}
        mode="edit"
        onClose={() => setEditingTool(null)}
        onSubmit={handleUpdate}
        open={Boolean(editingTool)}
        tool={editingTool}
      />

      <ToolDetailsDrawer
        canEdit={canEdit}
        metadata={metadata.data}
        onClose={() => setDetailsTool(null)}
        onMove={handleMove}
        onMoveToMachine={handleMoveToMachine}
        tool={detailsTool}
      />
    </div>
  );
}
