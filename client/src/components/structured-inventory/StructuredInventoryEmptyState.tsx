import { FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function StructuredInventoryEmptyState() {
  const { t } = useTranslation("inventory");
  return (
    <section className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
      <div className="text-base font-semibold text-white">{t("empty.title")}</div>
      <p className="mt-2 max-w-2xl">
        {t("empty.description")}
      </p>
      <Link
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
        to="/import"
      >
        <FileSpreadsheet size={17} /> {t("importExcel")}
      </Link>
    </section>
  );
}
