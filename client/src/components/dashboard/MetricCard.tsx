import type { LucideIcon } from "lucide-react";
import { formatNumber } from "../../utils/format";

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  tone: "accent" | "green" | "blue" | "amber" | "red";
  value: number;
};

const toneClasses: Record<MetricCardProps["tone"], string> = {
  accent: "text-accent",
  green: "text-green-400",
  blue: "text-sky-400",
  amber: "text-amber-400",
  red: "text-red-400",
};

export function MetricCard({ icon: Icon, label, tone, value }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-line bg-panel p-5 shadow-industrial backdrop-blur">
      <div className="mb-5 flex items-center justify-between">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5",
            toneClasses[tone],
          ].join(" ")}
        >
          <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
        </div>
      </div>
      <h2 className="text-sm font-medium text-slate-400">{label}</h2>
      <p className="mt-2 text-3xl font-semibold text-white">{formatNumber(value)}</p>
    </article>
  );
}
