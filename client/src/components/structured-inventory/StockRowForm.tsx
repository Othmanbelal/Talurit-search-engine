import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
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
  qrCodeImageUrl: "",
  attributes: [],
};

export function StockRowForm({ onAddRow }: { onAddRow: (input: AddStockRowInput) => Promise<void> }) {
  const [form, setForm] = useState<AddStockRowInput>({ ...initialForm, attributes: [] });
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.itemName.trim()) return;
    await onAddRow(cleanForm(form));
    setForm({ ...initialForm, attributes: [] });
    setMessage("Item added.");
  }

  return (
    <form className="space-y-4 rounded-lg border border-line bg-panel p-4 shadow-industrial" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <TextField label="Item name" onChange={(value) => update("itemName", value)} required value={form.itemName} />
        <TextField label="Article" onChange={(value) => update("articleNumber", value)} value={form.articleNumber ?? ""} />
        <TextField label="Alt. article" onChange={(value) => update("alternativeArticleNumber", value)} value={form.alternativeArticleNumber ?? ""} />
        <TextField label="Manufacturer" onChange={(value) => update("manufacturerName", value)} value={form.manufacturerName ?? ""} />
        <TextField label="Category" onChange={(value) => update("categoryName", value)} value={form.categoryName ?? ""} />
        <TextField label="Grade" onChange={(value) => update("grade", value)} value={form.grade ?? ""} />
        <LocationType value={form.locationType} onChange={(value) => update("locationType", value)} />
        <TextField label="Location / used in" onChange={(value) => update("locationCode", value)} value={form.locationCode ?? ""} />
        <TextField label="Fack / compartment" onChange={(value) => update("compartment", value)} value={form.compartment ?? ""} />
        <NumberField label="Quantity" onChange={(value) => update("quantity", value ?? 0)} value={form.quantity} />
        <TextField label="Unit" onChange={(value) => update("unit", value)} value={form.unit} />
        <NumberField label="Unit price" onChange={(value) => update("unitPrice", value)} value={form.unitPrice ?? 0} />
        <TextField label="Notes" onChange={(value) => update("notes", value)} value={form.notes ?? ""} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ImageUploadField label="Upload item picture" onChange={(value) => update("imageUrl", value)} previewAlt="Item picture" value={form.imageUrl} />
        <ImageUploadField label="Upload QR code image" onChange={(value) => update("qrCodeImageUrl", value)} previewAlt="Uploaded QR code" value={form.qrCodeImageUrl} />
      </div>
      <AttributeFields attributes={form.attributes} onChange={(value) => update("attributes", value)} />
      <div className="flex items-center justify-between gap-3">
        <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950" type="submit">
          <Plus size={17} /> Add item
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
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">Placement type</span>
      <select
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(event) => onChange(event.target.value as AddStockRowInput["locationType"])}
        value={value}
      >
        <option value="stockroom_position">Storage location</option>
        <option value="used_in">Used in</option>
        <option value="location_in">Location in</option>
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
    qrCodeImageUrl: emptyToNull(form.qrCodeImageUrl),
    attributes: form.attributes.filter((attribute) => attribute.name.trim() && attribute.rawValue?.trim()),
  };
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
