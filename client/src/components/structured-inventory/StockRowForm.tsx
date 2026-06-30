import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AddStockRowInput } from "../../types/structured-inventory";
import { AttributeFields } from "./AttributeFields";
import { ImageUploadField } from "./ImageUploadField";

const initialForm: AddStockRowInput = {
  itemName: "",
  manufacturerName: "",
  categoryName: "",
  articleNumber: "",
  alternativeArticleNumber: "",
  grade: "",
  locationCode: "",
  locationType: "stockroom_position",
  compartment: "",
  quantity: 1,
  unit: "pcs",
  unitPrice: null,
  currency: "SEK",
  notes: "",
  imageUrl: "",
  qrCodeId: "",
  qrCodeImageUrl: "",
  attributes: [],
};

export function StockRowForm({ onAddRow }: { onAddRow: (input: AddStockRowInput) => Promise<void> }) {
  const { t } = useTranslation("inventory");
  const [form, setForm] = useState<AddStockRowInput>({ ...initialForm, attributes: [] });
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.itemName.trim()) return;
    await onAddRow(cleanForm(form));
    setForm({ ...initialForm, attributes: [] });
    setMessage(t("addItem.itemAdded"));
  }

  return (
    <form className="space-y-4 rounded-lg border border-line bg-panel p-4 shadow-industrial" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TextField label={t("addItem.itemName")} onChange={(value) => update("itemName", value)} required value={form.itemName} />
        <TextField label={t("addItem.article")} onChange={(value) => update("articleNumber", value)} value={form.articleNumber ?? ""} />
        <TextField label={t("addItem.altArticle")} onChange={(value) => update("alternativeArticleNumber", value)} value={form.alternativeArticleNumber ?? ""} />
        <TextField label={t("addItem.manufacturer")} onChange={(value) => update("manufacturerName", value)} value={form.manufacturerName ?? ""} />
        <TextField label={t("addItem.category")} onChange={(value) => update("categoryName", value)} value={form.categoryName ?? ""} />
        <TextField label={t("addItem.grade")} onChange={(value) => update("grade", value)} value={form.grade ?? ""} />
        <LocationType value={form.locationType} onChange={(value) => update("locationType", value)} />
        <TextField label={t("addItem.locationUsedIn")} onChange={(value) => update("locationCode", value)} value={form.locationCode ?? ""} />
        <TextField label={t("addItem.fackCompartment")} onChange={(value) => update("compartment", value)} value={form.compartment ?? ""} />
        <NumberField label={t("addItem.quantity")} onChange={(value) => update("quantity", value ?? 0)} value={form.quantity} />
        <TextField label={t("addItem.unit")} onChange={(value) => update("unit", value)} value={form.unit} />
        <NumberField label={t("addItem.unitPrice")} onChange={(value) => update("unitPrice", value)} value={form.unitPrice ?? 0} />
        <TextField label={t("addItem.notes")} onChange={(value) => update("notes", value)} value={form.notes ?? ""} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ImageUploadField label={t("addItem.uploadItemPicture")} onChange={(value) => update("imageUrl", value)} previewAlt={t("details.itemPicture")} value={form.imageUrl} />
        <ImageUploadField
          decodeQr
          label={t("addItem.uploadQrCode")}
          onChange={(value) => update("qrCodeImageUrl", value)}
          onDecodedText={(value) => update("qrCodeId", value)}
          previewAlt={t("details.qrCode")}
          value={form.qrCodeImageUrl}
        />
      </div>
      <AttributeFields attributes={form.attributes} onChange={(value) => update("attributes", value)} />
      <div className="flex items-center justify-between gap-3">
        <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950" type="submit">
          <Plus size={17} /> {t("addItem.addItem")}
        </button>
        {message ? <span className="text-sm text-emerald-200">{message}</span> : null}
      </div>
    </form>
  );

  function update<Key extends keyof AddStockRowInput>(key: Key, value: AddStockRowInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
}

function TextField({ label, onChange, required = false, value }: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <input
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function NumberField({ label, onChange, value }: { label: string; onChange: (value: number | null) => void; value: number }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <input
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
        step="any"
        type="number"
        value={value}
      />
    </label>
  );
}

function LocationType({ onChange, value }: {
  onChange: (value: AddStockRowInput["locationType"]) => void;
  value: AddStockRowInput["locationType"];
}) {
  const { t } = useTranslation("inventory");
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{t("addItem.placementType")}</span>
      <select
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(event) => onChange(event.target.value as AddStockRowInput["locationType"])}
        value={value}
      >
        <option value="stockroom_position">{t("addItem.storageLocation")}</option>
        <option value="used_in">{t("addItem.usedIn")}</option>
        <option value="location_in">{t("addItem.locationIn")}</option>
      </select>
    </label>
  );
}

function cleanForm(form: AddStockRowInput): AddStockRowInput {
  return {
    ...form,
    manufacturerName: emptyToNull(form.manufacturerName),
    categoryName: emptyToNull(form.categoryName),
    articleNumber: emptyToNull(form.articleNumber),
    alternativeArticleNumber: emptyToNull(form.alternativeArticleNumber),
    grade: emptyToNull(form.grade),
    locationCode: emptyToNull(form.locationCode),
    compartment: emptyToNull(form.compartment),
    unitPrice: form.unitPrice || null,
    notes: emptyToNull(form.notes),
    imageUrl: emptyToNull(form.imageUrl),
    qrCodeId: emptyToNull(form.qrCodeId),
    qrCodeImageUrl: emptyToNull(form.qrCodeImageUrl),
    attributes: form.attributes.filter((attribute) => attribute.name.trim() && attribute.rawValue?.trim()),
  };
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
