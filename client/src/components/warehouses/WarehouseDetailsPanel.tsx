import { FormEvent, useEffect, useState } from "react";
import type { WarehouseLayout } from "../../types/warehouse";

export function WarehouseDetailsPanel({
  onUpdate,
  warehouse,
}: {
  onUpdate: (input: { name?: string; description?: string | null }) => Promise<void>;
  warehouse: WarehouseLayout;
}) {
  const [name, setName] = useState(warehouse.name);
  const [description, setDescription] = useState(warehouse.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setName(warehouse.name);
    setDescription(warehouse.description ?? "");
  }, [warehouse]);

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate({ name: name.trim(), description: description.trim() || null });
      setError(null);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="rounded-lg border border-line bg-panel p-4" onSubmit={saveDetails}>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Warehouse details</h2>
          <p className="text-sm text-slate-400">These details identify the saved database-backed design.</p>
        </div>
        <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={isSaving || !name.trim()} type="submit">
          Save details
        </button>
      </div>
      {error ? <p className="mt-3 rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <label className="block text-sm font-semibold text-slate-300">
          Name
          <input className="mt-2 w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-white" onChange={(event) => setName(event.target.value)} value={name} />
        </label>
        <label className="block text-sm font-semibold text-slate-300">
          Description
          <input className="mt-2 w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-white" onChange={(event) => setDescription(event.target.value)} value={description} />
        </label>
      </div>
    </form>
  );
}
