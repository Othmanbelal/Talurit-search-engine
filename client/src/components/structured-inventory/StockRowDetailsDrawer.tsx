import { AlertTriangle, Pencil, Warehouse, X } from "lucide-react";
import { Modal } from "../Modal";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePermissions } from "../../hooks/usePermissions";
import { buildApiUrl } from "../../services/http";
import { getAssignmentByStockRequest } from "../../services/warehouse.service";
import type { WarehouseStockPlacement } from "../../types/warehouse";
import type {
  ItemAttributeInput,
  StructuredStockRow,
  UpdateStockRowInput,
} from "../../types/structured-inventory";
import { EditBody, type FormState } from "./StockRowEditBody";
import { StockRowHistory } from "./StockRowHistory";
import { ItemNotesPanel } from "./ItemNotesPanel";
import { UrgentIssueModal } from "./UrgentIssueModal";
import { LowStockSection } from "./LowStockSection";

export function StockRowDetailsDrawer({
  historyKey,
  lowStockConfigurable,
  onClose,
  onConfigureLowStock,
  onSave,
  row,
  tableId,
  tableName,
}: {
  historyKey?: number;
  lowStockConfigurable?: boolean;
  onClose: () => void;
  onConfigureLowStock?: (row: StructuredStockRow) => void;
  onSave: (rowId: string, input: UpdateStockRowInput) => Promise<void>;
  row: StructuredStockRow | null;
  tableId?: string;
  tableName?: string;
}) {
  const { t } = useTranslation("inventory");
  const { canTakeReturn } = usePermissions();
  const [form, setForm] = useState<FormState | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [warehousePlacement, setWarehousePlacement] = useState<WarehouseStockPlacement | null>(null);

  useEffect(() => {
    setForm(row ? formFromRow(row) : null);
    setIsEditing(false);
    setMessage(null);
    setUrgentOpen(false);
    setWarehousePlacement(null);
    if (row) {
      getAssignmentByStockRequest(row.id)
        .then((result) => setWarehousePlacement(result.assignment))
        .catch(() => null);
    }
  }, [row]);

  if (!row || !form) return null;

  async function save() {
    if (!row || !form) return;
    await onSave(row.id, cleanForm(form));
    setIsEditing(false);
    setMessage(t("details.itemSaved"));
  }

  return (
    <>
      <Modal maxWidth="max-w-6xl" onClose={onClose}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              {t("details.itemDetails")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{row.item.name}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isEditing && canTakeReturn && tableId && (
              <button
                className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:border-red-400 hover:bg-red-500/20"
                onClick={() => setUrgentOpen(true)}
                type="button"
              >
                <AlertTriangle size={15} /> {t("details.urgentIssue")}
              </button>
            )}
            {!isEditing && (
              <button
                className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent"
                onClick={() => setIsEditing(true)}
                type="button"
              >
                <Pencil size={16} /> {t("row.edit")}
              </button>
            )}
            <button
              className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          <div className="flex-1 overflow-y-auto p-5">
            {isEditing ? (
              <EditBody form={form} update={update} />
            ) : (
              <ViewBody
                form={form}
                historyKey={historyKey}
                lowStockConfigure={lowStockConfigurable ? onConfigureLowStock : undefined}
                row={row}
                warehousePlacement={warehousePlacement}
              />
            )}
          </div>
          <ItemNotesPanel stockBalanceId={row.id} />
        </div>

        {isEditing && (
          <footer className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-emerald-200">{message}</span>
            <div className="flex gap-2">
              <button
                className="flex-1 rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-slate-200 sm:flex-none"
                onClick={() => setIsEditing(false)}
                type="button"
              >
                {t("row.cancel")}
              </button>
              <button
                className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 sm:flex-none"
                onClick={save}
                type="button"
              >
                {t("details.saveEdit")}
              </button>
            </div>
          </footer>
        )}
      </Modal>

      {urgentOpen && tableId && (
        <UrgentIssueModal
          itemName={row.item.name}
          tableName={tableName ?? ""}
          tableId={tableId}
          stockBalanceId={row.id}
          onClose={() => setUrgentOpen(false)}
        />
      )}
    </>
  );

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }
}

function ViewBody({
  form,
  historyKey,
  lowStockConfigure,
  row,
  warehousePlacement,
}: {
  form: FormState;
  historyKey?: number;
  lowStockConfigure?: (row: StructuredStockRow) => void;
  row: StructuredStockRow;
  warehousePlacement: WarehouseStockPlacement | null;
}) {
  const { t } = useTranslation("inventory");
  return (
    <div className="space-y-5">
      <MediaPreview form={form} />
      <section className="grid gap-3 md:grid-cols-2">
        {detailCards(form, row, t).map((item) => (
          <DetailCard item={item} key={item.label} />
        ))}
      </section>
      <LowStockSection onConfigure={lowStockConfigure} row={row} />
      {warehousePlacement && (
        <section className="rounded-lg border border-accent/30 bg-accent/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                <Warehouse size={13} /> {t("details.warehousePlacement")}
              </div>
              <p className="mt-1 font-semibold text-white">{warehousePlacement.warehouseName}</p>
              <p className="mt-0.5 text-sm text-slate-400">
                {warehousePlacement.slotDisplayName ?? warehousePlacement.slotCode} / FACK{" "}
                {warehousePlacement.slotCompartment}
              </p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center gap-2 rounded-md border border-accent px-3 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-slate-950"
              to={`/warehouses/${warehousePlacement.warehouseId}?view=3d&slot=${warehousePlacement.slotId}&stock=${row.id}`}
            >
              <Warehouse size={15} /> {t("details.viewInWarehouse")}
            </Link>
          </div>
        </section>
      )}
      <AttributeWidgets attributes={form.attributes} />
      <StockRowHistory rowId={row.id} refreshKey={historyKey} />
    </div>
  );
}

function MediaPreview({ form }: { form: FormState }) {
  const { t } = useTranslation("inventory");
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <ImagePreview alt={t("details.itemPicture")} label={t("details.itemPicture")} value={form.imageUrl} />
      <ImagePreview alt={t("details.qrCode")} label={t("details.qrCode")} value={form.qrCodeImageUrl} />
    </section>
  );
}

function NoImageText() {
  const { t } = useTranslation("inventory");
  return <p className="mt-3 text-sm text-slate-500">{t("details.noImage")}</p>;
}

function ImagePreview({ alt, label, value }: { alt: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.03] p-4">
      <h3 className="text-sm font-semibold text-white">{label}</h3>
      {value ? (
        <img
          alt={alt}
          className="mt-3 h-48 w-full rounded-md border border-line bg-slate-100 object-contain p-2"
          src={buildApiUrl(value)}
        />
      ) : (
        <NoImageText />
      )}
    </div>
  );
}

function DetailCard({ item }: { item: { label: string; value: string } }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.03] p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {item.label}
      </div>
      <div className="mt-2 font-semibold text-white">{item.value || "-"}</div>
    </div>
  );
}

function AttributeWidgets({ attributes }: { attributes: ItemAttributeInput[] }) {
  const { t } = useTranslation("inventory");
  return (
    <section className="rounded-lg border border-line bg-white/[0.03] p-4">
      <h3 className="font-semibold text-white">{t("details.additionalColumns")}</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {attributes.length === 0 ? (
          <p className="text-sm text-slate-500">{t("details.noAdditionalColumns")}</p>
        ) : null}
        {attributes.map((attribute) => (
          <DetailCard
            item={{
              label: attribute.name,
              value: [attribute.rawValue || "-", attribute.unit].filter(Boolean).join(" "),
            }}
            key={`${attribute.name}-${attribute.rawValue}`}
          />
        ))}
      </div>
    </section>
  );
}

function detailCards(form: FormState, row: StructuredStockRow, t: (key: string) => string) {
  return [
    { label: t("details.itemName"), value: form.itemName },
    { label: t("details.manufacturer"), value: form.manufacturerName },
    { label: t("details.article"), value: form.articleNumber },
    { label: t("details.altArticle"), value: form.alternativeArticleNumber },
    { label: t("details.category"), value: form.categoryName },
    { label: t("details.grade"), value: form.grade },
    { label: t("details.placementType"), value: placementLabel(form.locationType, t) },
    { label: t("details.locationUsedIn"), value: form.locationCode },
    { label: t("details.fackCompartment"), value: form.compartment },
    { label: t("addItem.quantity"), value: `${row.quantity} ${row.unit}` },
    { label: t("details.unitPrice"), value: form.unitPrice === null ? "" : `${form.unitPrice} ${form.currency}` },
  ];
}

function placementLabel(value: FormState["locationType"], t: (key: string) => string) {
  if (value === "used_in") return t("details.usedIn");
  if (value === "location_in") return t("details.locationIn");
  return t("details.storageLocation");
}

function formFromRow(row: StructuredStockRow): FormState {
  return {
    itemName: row.item.name,
    manufacturerName: row.item.manufacturer ?? "",
    categoryName: row.item.category ?? "",
    articleNumber: row.item.articleNumber ?? "",
    alternativeArticleNumber: row.item.alternativeArticleNumber ?? "",
    grade: row.item.grade ?? "",
    locationCode: row.location?.code ?? "",
    locationType: (row.location?.locationType as FormState["locationType"]) ?? "stockroom_position",
    compartment: row.compartment ?? "",
    quantity: row.quantity,
    unit: row.unit,
    unitPrice: row.unitPrice ?? null,
    currency: row.currency,
    notes: row.notes ?? "",
    imageUrl: row.item.imageUrl ?? "",
    qrCodeId: row.item.qrCodeId,
    qrCodeImageUrl: row.item.qrCodeImageUrl ?? "",
    attributes: row.item.attributes.map((attribute) => ({
      name: attribute.name,
      rawValue: attribute.rawValue ?? "",
      unit: attribute.unit ?? "",
    })),
  };
}

function cleanForm(form: FormState): UpdateStockRowInput {
  const cleaned = Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, value === "" ? null : value])
  ) as UpdateStockRowInput;
  cleaned.attributes = form.attributes.filter(
    (attribute) => attribute.name.trim() && attribute.rawValue?.trim()
  );
  return cleaned;
}
