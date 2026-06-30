import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CreateWarehouseShelfInput } from "../../types/warehouse";

type Props = {
  onCreate: (input: CreateWarehouseShelfInput) => Promise<void>;
};

export function WarehouseShelfCreateForm({ onCreate }: Props) {
  const { t } = useTranslation("warehouses");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [compartments, setCompartments] = useState("1,2,3,4");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setIsSaving(true);
    try {
      await onCreate({
        code: code.trim(),
        displayName: displayName.trim() || null,
        compartments: compartments.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setCode("");
      setDisplayName("");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-3 rounded-lg border border-line bg-slate-950/40 p-4 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={submit}>
      <input className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => setCode(event.target.value)} placeholder={t("shelf.codePlaceholder")} value={code} />
      <input className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => setDisplayName(event.target.value)} placeholder={t("shelf.displayNamePlaceholder")} value={displayName} />
      <input className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => setCompartments(event.target.value)} placeholder={t("shelf.fackPlaceholder")} value={compartments} />
      <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={isSaving || !code.trim()} type="submit">
        {isSaving ? t("shelf.adding") : t("shelf.addShelf")}
      </button>
    </form>
  );
}
