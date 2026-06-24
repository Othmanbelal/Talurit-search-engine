import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { MachineInventoryTable } from "../components/machines/MachineInventoryTable";
import { MachineToolLinkModal } from "../components/machines/MachineToolLinkModal";
import { ToolDetailsDrawer } from "../components/tools/ToolDetailsDrawer";
import { useAuth } from "../hooks/useAuth";
import { useMachineSlots } from "../hooks/useMachineSlots";
import { useToolMetadata } from "../hooks/useToolMetadata";
import type { Tool, ToolPlacementPayload } from "../types/tools";

export function MachineDetailsPage() {
  const { t } = useTranslation("machines");
  const { id } = useParams();
  const { user } = useAuth();
  const metadata = useToolMetadata();
  const {
    error,
    isLoading,
    linkTool,
    machine,
    moveTool,
    tools,
  } = useMachineSlots(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailsTool, setDetailsTool] = useState<Tool | null>(null);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const canEdit = user?.role === "admin" || user?.role === "manager";

  async function handleLinkTool(toolId: string, quantity: number) {
    setActionError(null);

    try {
      await linkTool(toolId, quantity);
    } catch (linkError) {
      setActionError(linkError instanceof Error ? linkError.message : t("error.linkFailed"));
      throw linkError;
    }
  }

  async function handleMove(tool: Tool, payload: ToolPlacementPayload) {
    const updated = await moveTool(tool, payload);
    setDetailsTool(updated);
    return updated;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="space-y-4">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent"
          to="/machines"
        >
          <ArrowLeft size={16} /> {t("details.backToMachines")}
        </Link>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              {t("details.machineDetail")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              {machine?.name ?? t("sectionLabel")}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit ? (
              <button
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
                onClick={() => setIsLinkOpen(true)}
                type="button"
              >
                <Plus size={17} /> {t("details.addItem")}
              </button>
            ) : null}
            <div className="rounded-lg border border-line bg-white/5 px-4 py-3 text-sm text-slate-300">
              {tools.length} {t("details.databaseItems")}
            </div>
          </div>
        </div>
      </header>

      {error || actionError ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error ?? actionError}
        </section>
      ) : null}

      <MachineInventoryTable
        isLoading={isLoading}
        onView={setDetailsTool}
        tools={tools}
      />
      <ToolDetailsDrawer
        canEdit={canEdit}
        metadata={metadata.data}
        onClose={() => setDetailsTool(null)}
        onMove={handleMove}
        tool={detailsTool}
      />
      {machine ? (
        <MachineToolLinkModal
          machineId={machine.id}
          machineName={machine.name}
          onClose={() => setIsLinkOpen(false)}
          onSubmit={handleLinkTool}
          open={isLinkOpen}
        />
      ) : null}
    </div>
  );
}
