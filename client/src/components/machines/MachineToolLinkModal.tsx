import { FormEvent, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToolLookup } from "../../hooks/useToolLookup";
import type { Tool } from "../../types/tools";
import { formatLocation, formatNullable } from "../../utils/tool-format";

type MachineToolLinkModalProps = {
  machineId: string;
  machineName: string;
  onClose: () => void;
  onSubmit: (toolId: string, quantity: number) => Promise<void>;
  open: boolean;
};

export function MachineToolLinkModal({
  machineId,
  machineName,
  onClose,
  onSubmit,
  open,
}: MachineToolLinkModalProps) {
  const { t } = useTranslation("machines");
  const [query, setQuery] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedToolId, setSelectedToolId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const lookup = useToolLookup(query);
  const availableTools = useMemo(
    () =>
      lookup.tools.filter((tool) => {
        const hasQuantity = (tool.quantity ?? 0) > 0;
        return hasQuantity && tool.machine?.id !== machineId;
      }),
    [lookup.tools, machineId],
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setQuantity("1");
    setSelectedToolId("");
  }, [open]);

  useEffect(() => {
    if (!selectedToolId && availableTools[0]) {
      setSelectedToolId(availableTools[0].id);
    }
  }, [availableTools, selectedToolId]);

  if (!open) return null;

  const selectedTool = availableTools.find((tool) => tool.id === selectedToolId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedTool) {
      setError("Select a tool with available quantity.");
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      setError("Quantity must be at least 1.");
      return;
    }

    if ((selectedTool.quantity ?? 0) < parsedQuantity) {
      setError("Quantity is higher than the available inventory.");
      return;
    }

    setIsSaving(true);

    try {
      await onSubmit(selectedTool.id, parsedQuantity);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not add item");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-lg border border-line bg-slate-900 shadow-industrial">
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{t("linkModal.addItemTo", { machineName })}</h2>
            <p className="text-sm text-slate-400">
              {t("linkModal.linkExistingInventory")}
            </p>
          </div>
          <button className="rounded-md border border-line p-2 text-slate-300" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <form className="space-y-4 px-5 py-5" onSubmit={handleSubmit}>
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
            <input
              className="w-full rounded-md border border-line bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-accent"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("linkModal.searchPlaceholder")}
              value={query}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-[1fr_130px]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">{t("linkModal.existingTool")}</span>
              <select
                className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
                onChange={(event) => setSelectedToolId(event.target.value)}
                value={selectedToolId}
              >
                {availableTools.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {toolOptionLabel(tool)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">{t("linkModal.quantity")}</span>
              <input
                className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
                min={1}
                onChange={(event) => setQuantity(event.target.value)}
                type="number"
                value={quantity}
              />
            </label>
          </div>

          {selectedTool ? <SelectedTool tool={selectedTool} /> : null}
          {lookup.error || error ? <p className="text-sm text-red-300">{error ?? lookup.error}</p> : null}
          {lookup.isLoading ? <p className="text-sm text-slate-400">{t("linkModal.searching")}</p> : null}

          <footer className="flex justify-end gap-2">
            <button className="rounded-md border border-line px-4 py-2 text-sm text-slate-200" onClick={onClose} type="button">
              {t("linkModal.cancel")}
            </button>
            <button
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              disabled={isSaving || !selectedTool}
              type="submit"
            >
              {isSaving ? t("linkModal.adding") : t("linkModal.addToMachine")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function SelectedTool({ tool }: { tool: Tool }) {
  const { t } = useTranslation("machines");

  return (
    <div className="rounded-lg border border-line bg-white/[0.03] p-4 text-sm text-slate-300">
      <div className="font-medium text-white">{tool.productName}</div>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <span>{t("linkModal.article")}: {formatNullable(tool.articleNumber)}</span>
        <span>{t("linkModal.available")}: {formatNullable(tool.quantity)}</span>
        <span>{t("linkModal.locationLabel")}: {formatLocation(tool.location)}</span>
      </div>
    </div>
  );
}

function toolOptionLabel(tool: Tool) {
  return `${tool.productName} / ${formatNullable(tool.articleNumber)} / qty ${formatNullable(tool.quantity)}`;
}
