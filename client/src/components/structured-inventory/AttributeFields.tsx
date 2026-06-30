import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ItemAttributeInput } from "../../types/structured-inventory";

export function AttributeFields({
  attributes,
  onChange,
}: {
  attributes: ItemAttributeInput[];
  onChange: (attributes: ItemAttributeInput[]) => void;
}) {
  const { t } = useTranslation("inventory");

  function update(index: number, patch: Partial<ItemAttributeInput>) {
    onChange(attributes.map((attribute, current) => current === index ? { ...attribute, ...patch } : attribute));
  }

  function remove(index: number) {
    if (!window.confirm(t("attributes.confirmRemove"))) return;
    onChange(attributes.filter((_, current) => current !== index));
  }

  return (
    <section className="space-y-3 rounded-lg border border-line bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">{t("attributes.title")}</h3>
          <p className="text-sm text-slate-400">{t("attributes.subtitle")}</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200" onClick={() => onChange([...attributes, { name: "", rawValue: "", unit: "" }])} type="button">
          <Plus size={15} /> {t("attributes.addColumn")}
        </button>
      </div>
      {attributes.length === 0 ? <p className="text-sm text-slate-500">{t("attributes.noColumns")}</p> : null}
      <div className="space-y-2">
        {attributes.map((attribute, index) => (
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_120px_40px]" key={index}>
            <Field label={t("attributes.columnName")} onChange={(value) => update(index, { name: value })} value={attribute.name} />
            <Field label={t("attributes.value")} onChange={(value) => update(index, { rawValue: value })} value={attribute.rawValue ?? ""} />
            <Field label={t("attributes.unit")} onChange={(value) => update(index, { unit: value })} value={attribute.unit ?? ""} />
            <button className="mt-6 inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-400/40 bg-red-500/10 text-red-100" onClick={() => remove(index)} title={t("attributes.remove")} type="button">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium uppercase text-slate-500">{label}</span>
      <input className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}
