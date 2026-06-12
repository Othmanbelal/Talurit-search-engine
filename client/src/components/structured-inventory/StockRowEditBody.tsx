import type { ItemAttributeInput } from "../../types/structured-inventory";
import { AttributeFields } from "./AttributeFields";
import { ImageUploadField } from "./ImageUploadField";

export type FormState = {
  itemName: string;
  manufacturerName: string;
  categoryName: string;
  articleNumber: string;
  alternativeArticleNumber: string;
  grade: string;
  locationCode: string;
  locationType: "stockroom_position" | "used_in" | "location_in";
  compartment: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  currency: string;
  notes: string;
  imageUrl: string;
  qrCodeImageUrl: string;
  attributes: ItemAttributeInput[];
};

export function EditBody({ form, update }: {
  form: FormState;
  update: <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;
}) {
  return (
    <>
      <MediaPanel form={form} update={update} />
      <section className="grid gap-3 md:grid-cols-2">
        <TextField label="Item name" onChange={(value) => update("itemName", value)} value={form.itemName} />
        <TextField label="Manufacturer" onChange={(value) => update("manufacturerName", value)} value={form.manufacturerName} />
        <TextField label="Article" onChange={(value) => update("articleNumber", value)} value={form.articleNumber} />
        <TextField label="Alt. article" onChange={(value) => update("alternativeArticleNumber", value)} value={form.alternativeArticleNumber} />
        <TextField label="Category" onChange={(value) => update("categoryName", value)} value={form.categoryName} />
        <TextField label="Grade" onChange={(value) => update("grade", value)} value={form.grade} />
        <LocationType onChange={(value) => update("locationType", value)} value={form.locationType} />
        <TextField label="Location / used in" onChange={(value) => update("locationCode", value)} value={form.locationCode} />
        <TextField label="Fack / compartment" onChange={(value) => update("compartment", value)} value={form.compartment} />
        <NumberField label="Quantity" onChange={(value) => update("quantity", value)} value={form.quantity} />
        <TextField label="Unit" onChange={(value) => update("unit", value)} value={form.unit} />
        <NumberField label="Unit price" onChange={(value) => update("unitPrice", value)} value={form.unitPrice ?? 0} />
      </section>
      <NotesField onChange={(value) => update("notes", value)} value={form.notes} />
      <AttributeFields attributes={form.attributes} onChange={(value) => update("attributes", value)} />
    </>
  );
}

function MediaPanel({ form, update }: {
  form: FormState;
  update: <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-line bg-white/[0.03] p-4">
        <ImageUploadField label="Upload item picture" onChange={(value) => update("imageUrl", value)} previewAlt="Item picture" value={form.imageUrl} />
      </div>
      <div className="rounded-lg border border-line bg-white/[0.03] p-4">
        <ImageUploadField label="Upload QR code image" onChange={(value) => update("qrCodeImageUrl", value)} previewAlt="Uploaded QR code" value={form.qrCodeImageUrl} />
      </div>
    </section>
  );
}

function TextField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <input className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function NumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return <TextField label={label} onChange={(v) => onChange(Number(v || 0))} value={String(value)} />;
}

function NotesField({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">Notes</span>
      <textarea className="min-h-28 w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function LocationType({ onChange, value }: { onChange: (value: FormState["locationType"]) => void; value: FormState["locationType"] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">Placement type</span>
      <select className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value as FormState["locationType"])} value={value}>
        <option value="stockroom_position">Storage location</option>
        <option value="used_in">Used in</option>
        <option value="location_in">Location in</option>
      </select>
    </label>
  );
}
