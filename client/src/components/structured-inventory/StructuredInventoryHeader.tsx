import { FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function StructuredInventoryHeader() {
  const { t } = useTranslation("inventory");
  return (
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("header.sectionLabel")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("header.title")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          {t("header.subtitle")}
        </p>
      </div>
      <Link
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
        to="/import"
      >
        <FileSpreadsheet size={17} /> {t("importExcel")}
      </Link>
    </header>
  );
}
