import { FormEvent, useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CreateInventoryTableInput } from "../../types/structured-inventory";

export function TableCreatePanel({
  groupId,
  onCreateTable,
}: {
  groupId?: string;
  onCreateTable: (input: CreateInventoryTableInput) => Promise<void>;
}) {
  const { t } = useTranslation("inventory");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    await onCreateTable({ groupId, name: name.trim(), tableType: "manual_inventory" });
    setName("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 py-3 text-sm text-slate-500 transition-colors hover:border-accent/50 hover:text-accent"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Plus size={15} /> {t("create.addTableToGroup")}
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2 rounded-lg border border-accent/25 bg-accent/5 px-4 py-3"
      onSubmit={submit}
    >
      <input
        autoFocus
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-500"
        onChange={(e) => setName(e.target.value)}
        placeholder={t("create.tablePlaceholder")}
        value={name}
      />
      <button
        className="shrink-0 rounded px-3 py-1.5 text-xs font-semibold bg-accent text-slate-950 disabled:opacity-40"
        disabled={!name.trim()}
        type="submit"
      >
        {t("create.submit")}
      </button>
      <button
        className="shrink-0 rounded p-1 text-slate-500 hover:text-white"
        onClick={() => { setOpen(false); setName(""); }}
        type="button"
      >
        <X size={14} />
      </button>
    </form>
  );
}
