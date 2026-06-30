import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { StructuredImportBatch } from "../../lib/import/structuredImportTypes";

export function ImportResultStep({ batch }: { batch: StructuredImportBatch }) {
  const { t } = useTranslation("import");
  return (
    <section className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-5 text-emerald-100">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5" size={22} />
        <div>
          <h2 className="text-lg font-semibold text-white">{t("result.title")}</h2>
          <p className="mt-1 text-sm">
            {t("result.imported", { count: batch.counts.readyRows })}
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950"
            to="/inventory"
          >
            {t("result.viewInventory")} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
