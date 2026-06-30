import { Plus, Warehouse, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CreateWarehouseInput } from "../../types/warehouse";

export function WarehouseCreatePanel({ onCreate }: { onCreate: (input: CreateWarehouseInput) => Promise<void> }) {
  const { t } = useTranslation("warehouses");
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim() || null, layoutData: starterLayout(name.trim()) });
      setName("");
      setDescription("");
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  function cancel() {
    setIsOpen(false);
    setName("");
    setDescription("");
  }

  if (!isOpen) {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus size={15} /> {t("create.newWarehouse")}
      </button>
    );
  }

  return (
    <form
      className="rounded-xl border border-accent/20 bg-accent/5 px-5 py-4"
      onSubmit={submit}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-accent/30 text-accent">
            <Warehouse size={16} />
          </span>
          <span className="text-sm font-semibold text-white">{t("create.newWarehouse")}</span>
        </div>
        <button className="rounded p-1 text-slate-500 hover:text-white" onClick={cancel} type="button">
          <X size={15} />
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          autoFocus
          className="min-w-0 flex-1 rounded-md border border-line bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-accent"
          onChange={(e) => setName(e.target.value)}
          placeholder={t("create.warehouseName")}
          value={name}
        />
        <input
          className="min-w-0 flex-1 rounded-md border border-line bg-slate-950/60 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-accent"
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("create.descriptionOptional")}
          value={description}
        />
        <button
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
          disabled={isSaving || !name.trim()}
          type="submit"
        >
          {isSaving ? t("create.creating") : t("create.create")}
        </button>
      </div>
    </form>
  );
}

function starterLayout(name: string) {
  return {
    name,
    version: 1,
    room: { width: 12, depth: 8, height: 4.2, wallThickness: 0.16 },
    objects: [],
    settings: { unit: "m", gridSize: 0.25 },
  };
}
