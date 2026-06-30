import { useTranslation } from "react-i18next";
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
  qrCodeId: string;
  qrCodeImageUrl: string;
  attributes: ItemAttributeInput[];
};

export function EditBody({ form, update }: {
  form: FormState;
  update: <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;
}) {
  const { t } = useTranslation("inventory");
  return (
    <>
      <MediaPanel form={form} update={update} />
      <section className="grid gap-3 md:grid-cols-2">
        <TextField label={t("addItem.itemName")} onChange={(value) => update("itemName", value)} value={form.itemName} />
        <TextField label={t("addItem.manufacturer")} onChange={(value) => update("manufacturerName", value)} value={form.manufacturerName} />
        <TextField label={t("addItem.article")} onChange={(value) => update("articleNumber", value)} value={form.articleNumber} />
        <TextField label={t("addItem.altArticle")} onChange={(value) => update("alternativeArticleNumber", value)} value={form.alternativeArticleNumber} />
        <TextField label={t("addItem.category")} onChange={(value) => update("categoryName", value)} value={form.categoryName} />
        <TextField label={t("addItem.grade")} onChange={(value) => update("grade", value)} value={form.grade} />
        <LocationType onChange={(value) => update("locationType", value)} value={form.locationType} />
        <TextField label={t("addItem.locationUsedIn")} onChange={(value) => update("locationCode", value)} value={form.locationCode} />
        <TextField label={t("addItem.fackCompartment")} onChange={(value) => update("compartment", value)} value={form.compartment} />
        <NumberField label={t("addItem.quantity")} onChange={(value) => update("quantity", value)} value={form.quantity} />
        <TextField label={t("addItem.unit")} onChange={(value) => update("unit", value)} value={form.unit} />
        <NumberField label={t("addItem.unitPrice")} onChange={(value) => update("unitPrice", value)} value={form.unitPrice ?? 0} />
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
  const { t } = useTranslation("inventory");
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-line bg-white/[0.03] p-4">
        <ImageUploadField label={t("addItem.uploadItemPicture")} onChange={(value) => update("imageUrl", value)} previewAlt={t("details.itemPicture")} value={form.imageUrl} />
      </div>
      <div className="rounded-lg border border-line bg-white/[0.03] p-4">
        <ImageUploadField
          decodeQr
          label={t("addItem.uploadQrCode")}
          onChange={(value) => update("qrCodeImageUrl", value)}
          onDecodedText={(value) => update("qrCodeId", value)}
          previewAlt={t("details.qrCode")}
          value={form.qrCodeImageUrl}
        />
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
  const { t } = useTranslation("inventory");
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{t("addItem.notes")}</span>
      <textarea className="min-h-28 w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function LocationType({ onChange, value }: { onChange: (value: FormState["locationType"]) => void; value: FormState["locationType"] }) {
  const { t } = useTranslation("inventory");
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{t("addItem.placementType")}</span>
      <select className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value as FormState["locationType"])} value={value}>
        <option value="stockroom_position">{t("addItem.storageLocation")}</option>
        <option value="used_in">{t("addItem.usedIn")}</option>
        <option value="location_in">{t("addItem.locationIn")}</option>
      </select>
    </label>
  );
}
