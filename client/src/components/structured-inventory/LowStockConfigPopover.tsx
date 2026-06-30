import { PackageX, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../Modal";
import { setRowLowStockRequest } from "../../services/low-stock.service";
import type { StructuredStockRow } from "../../types/structured-inventory";

export function LowStockConfigPopover({ onClose, onSaved, row, tableId }: {
  onClose: () => void;
  onSaved: () => void;
  row: StructuredStockRow;
  tableId: string;
}) {
  const { t } = useTranslation("inventory");
  const [enabled, setEnabled] = useState(row.lowStockEnabled);
  const [threshold, setThreshold] = useState(row.lowStockThreshold != null ? String(row.lowStockThreshold) : "");
  const [reorderUrl, setReorderUrl] = useState(row.reorderUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const parsed = threshold.trim() === "" ? null : Number(threshold);
    if (enabled && (parsed == null || Number.isNaN(parsed) || parsed < 0)) {
      setError(t("lowStock.invalidThreshold"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setRowLowStockRequest(tableId, row.id, {
        enabled,
        threshold: parsed,
        reorderUrl: reorderUrl.trim() === "" ? null : reorderUrl.trim(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("lowStock.errorSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal maxWidth="max-w-md" onClose={onClose}>
      <header className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t("lowStock.title")}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{row.item.name}</h2>
        </div>
        <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </header>

      <div className="space-y-4 p-5">
        <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-white/[0.03] px-3 py-2.5">
          <span className="text-sm font-semibold text-slate-200">{t("lowStock.monitor")}</span>
          <input checked={enabled} onChange={(e) => setEnabled(e.target.checked)} type="checkbox" className="h-4 w-4 accent-[var(--accent,#f0a500)]" />
        </label>

        <Field label={t("lowStock.threshold", { unit: row.unit })}>
          <input
            className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-accent disabled:opacity-50"
            disabled={!enabled}
            min={0}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="e.g. 5"
            type="number"
            value={threshold}
          />
        </Field>

        <Field label={t("lowStock.orderLink")}>
          <input
            className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-accent disabled:opacity-50"
            disabled={!enabled}
            onChange={(e) => setReorderUrl(e.target.value)}
            placeholder="https://supplier.example/product"
            type="url"
            value={reorderUrl}
          />
          <p className="mt-1 text-xs text-slate-500">{t("lowStock.orderLinkHint")}</p>
        </Field>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-line p-5">
        {row.lowStockEnabled ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-semibold text-slate-300 hover:border-red-400 hover:text-red-200 disabled:opacity-50"
            disabled={saving}
            onClick={() => { setEnabled(false); setThreshold(""); void saveDisabled(); }}
            type="button"
          >
            <PackageX size={14} /> {t("lowStock.turnOff")}
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200" onClick={onClose} type="button">{t("lowStock.cancel")}</button>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} onClick={() => void save()} type="button">
            {saving ? t("lowStock.saving") : t("lowStock.save")}
          </button>
        </div>
      </footer>
    </Modal>
  );

  async function saveDisabled() {
    setSaving(true);
    setError(null);
    try {
      await setRowLowStockRequest(tableId, row.id, { enabled: false, threshold: null, reorderUrl: null });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("lowStock.errorTurnOff"));
    } finally {
      setSaving(false);
    }
  }
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase text-slate-400">{label}</span>
      {children}
    </label>
  );
}
