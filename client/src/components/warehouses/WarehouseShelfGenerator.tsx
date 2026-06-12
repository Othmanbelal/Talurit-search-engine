import { FormEvent, useState } from "react";
import type { GenerateWarehouseShelvesInput } from "../../types/warehouse";

type Props = {
  onGenerate: (input: GenerateWarehouseShelvesInput) => Promise<void>;
};

export function WarehouseShelfGenerator({ onGenerate }: Props) {
  const [form, setForm] = useState({
    planNumber: 10,
    sectionLetter: "A",
    positionStart: 1,
    positionEnd: 8,
    compartmentStart: 1,
    compartmentEnd: 4,
  });
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onGenerate(form);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-3 rounded-lg border border-line bg-slate-950/40 p-4 lg:grid-cols-7" onSubmit={submit}>
      <NumberField label="Plan" min={1} onChange={(planNumber) => setForm((current) => ({ ...current, planNumber }))} value={form.planNumber} />
      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        Section
        <input className="mt-2 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" maxLength={4} onChange={(event) => setForm((current) => ({ ...current, sectionLetter: event.target.value.toUpperCase() }))} value={form.sectionLetter} />
      </label>
      <NumberField label="Position from" min={1} onChange={(positionStart) => setForm((current) => ({ ...current, positionStart }))} value={form.positionStart} />
      <NumberField label="Position to" min={form.positionStart} onChange={(positionEnd) => setForm((current) => ({ ...current, positionEnd }))} value={form.positionEnd} />
      <NumberField label="FACK from" min={1} onChange={(compartmentStart) => setForm((current) => ({ ...current, compartmentStart }))} value={form.compartmentStart} />
      <NumberField label="FACK to" min={form.compartmentStart} onChange={(compartmentEnd) => setForm((current) => ({ ...current, compartmentEnd }))} value={form.compartmentEnd} />
      <button className="self-end rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={isSaving} type="submit">
        {isSaving ? "Generating" : "Generate"}
      </button>
    </form>
  );
}

function NumberField({ label, min, onChange, value }: { label: string; min: number; onChange: (value: number) => void; value: number }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
      {label}
      <input className="mt-2 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" min={min} onChange={(event) => onChange(Number(event.target.value))} type="number" value={value} />
    </label>
  );
}
