import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { formatToolStatus, toolStatuses } from "../../constants/tool-statuses";
import type { ToolMetadata } from "../../types/metadata";
import type { Tool, ToolPayload, ToolStatus } from "../../types/tools";
import { formatLocation } from "../../utils/tool-format";

const editableStatuses = toolStatuses.filter((status) => status !== "ARCHIVED");

type ToolFormModalProps = {
  metadata: ToolMetadata;
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (payload: ToolPayload) => Promise<void>;
  open: boolean;
  tool: Tool | null;
};

type FormState = {
  productName: string;
  articleNumber: string;
  manufacturerId: string;
  toolTypeId: string;
  locationId: string;
  machineId: string;
  quantity: string;
  status: ToolStatus;
  notes: string;
};

const emptyForm: FormState = {
  productName: "",
  articleNumber: "",
  manufacturerId: "",
  toolTypeId: "",
  locationId: "",
  machineId: "",
  quantity: "",
  status: "AVAILABLE",
  notes: "",
};

export function ToolFormModal({
  metadata,
  mode,
  onClose,
  onSubmit,
  open,
  tool,
}: ToolFormModalProps) {
  const { t } = useTranslation("tools");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setForm(tool ? formFromTool(tool) : emptyForm);
  }, [open, tool]);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.productName.trim()) {
      setError(t("form.productNameRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(toPayload(form));
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("form.unableToSave"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <section className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-slate-900 shadow-industrial">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {mode === "create" ? t("form.createTitle") : t("form.editTitle")}
            </h2>
            <p className="text-sm text-slate-400">{t("form.subtitle")}</p>
          </div>
          <button className="rounded-md border border-line p-2 text-slate-300" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <form className="overflow-y-auto px-5 py-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <TextField label={t("form.productName")} onChange={(value) => update("productName", value)} required value={form.productName} />
            <TextField label={t("form.articleNumber")} onChange={(value) => update("articleNumber", value)} value={form.articleNumber} />
            <SelectField label={t("form.manufacturer")} onChange={(value) => update("manufacturerId", value)} value={form.manufacturerId}>
              <option value="">{t("form.none")}</option>
              {metadata.manufacturers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
            <SelectField label={t("form.toolType")} onChange={(value) => update("toolTypeId", value)} value={form.toolTypeId}>
              <option value="">{t("form.none")}</option>
              {metadata.toolTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
            <SelectField label={t("form.location")} onChange={(value) => update("locationId", value)} value={form.locationId}>
              <option value="">{t("form.none")}</option>
              {metadata.locations.map((item) => <option key={item.id} value={item.id}>{formatLocation(item)}</option>)}
            </SelectField>
            <SelectField label={t("form.machine")} onChange={(value) => update("machineId", value)} value={form.machineId}>
              <option value="">{t("form.none")}</option>
              {metadata.machines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
            <TextField label={t("form.quantity")} onChange={(value) => update("quantity", value)} type="number" value={form.quantity} />
            <SelectField label={t("form.status")} onChange={(value) => update("status", value as ToolStatus)} value={form.status}>
              {editableStatuses.map((status) => <option key={status} value={status}>{formatToolStatus(status)}</option>)}
            </SelectField>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-300">{t("form.notes")}</span>
            <textarea
              className="min-h-24 w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              onChange={(event) => update("notes", event.target.value)}
              value={form.notes}
            />
          </label>

          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

          <footer className="mt-5 flex justify-end gap-2">
            <button className="rounded-md border border-line px-4 py-2 text-sm text-slate-200" onClick={onClose} type="button">
              {t("form.cancel")}
            </button>
            <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isSubmitting} type="submit">
              {isSubmitting ? t("form.saving") : t("form.saveTool")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
}

function formFromTool(tool: Tool): FormState {
  return {
    productName: tool.productName,
    articleNumber: tool.articleNumber ?? "",
    manufacturerId: tool.manufacturer?.id ?? "",
    toolTypeId: tool.toolType?.id ?? "",
    locationId: tool.location?.id ?? "",
    machineId: tool.machine?.id ?? "",
    quantity: tool.quantity === null || tool.quantity === undefined ? "" : String(tool.quantity),
    status: tool.status,
    notes: tool.notes ?? "",
  };
}

function toPayload(form: FormState): ToolPayload {
  return {
    productName: form.productName.trim(),
    articleNumber: optionalText(form.articleNumber),
    manufacturerId: optionalText(form.manufacturerId),
    toolTypeId: optionalText(form.toolTypeId),
    locationId: optionalText(form.locationId),
    machineId: optionalText(form.machineId),
    quantity: form.quantity === "" ? null : Number(form.quantity),
    status: form.status,
    notes: optionalText(form.notes),
  };
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function TextField({
  label,
  onChange,
  required,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SelectField({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <select
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}
