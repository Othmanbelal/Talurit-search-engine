import { AlertTriangle, Boxes, MapPin, Rows3 } from "lucide-react";
import type { ExcelPreview } from "../../types/import";

type ImportSummaryCardsProps = {
  preview: ExcelPreview;
};

export function ImportSummaryCards({ preview }: ImportSummaryCardsProps) {
  const items = [
    { label: "Tools", value: preview.summary.tools, icon: Boxes },
    { label: "Locations", value: preview.summary.locations, icon: MapPin },
    { label: "Issues", value: preview.summary.issues, icon: AlertTriangle },
    { label: "Duplicates", value: preview.summary.duplicates, icon: Rows3 },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div className="rounded-lg border border-line bg-white/5 p-4" key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-400">{item.label}</div>
              <Icon className="text-accent" size={18} />
            </div>
            <div className="mt-3 text-3xl font-semibold text-white">{item.value}</div>
          </div>
        );
      })}
    </section>
  );
}
