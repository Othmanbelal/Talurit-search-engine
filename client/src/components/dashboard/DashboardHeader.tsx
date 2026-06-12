type DashboardHeaderProps = {
  lowStockThreshold: number | null;
};

export function DashboardHeader({ lowStockThreshold }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
          Tool Room Overview
        </h1>
      </div>

      <div className="rounded-lg border border-line bg-white/5 px-4 py-3 text-sm text-slate-300">
        Low stock threshold{" "}
        <span className="font-semibold text-white">{lowStockThreshold ?? "-"}</span>
      </div>
    </div>
  );
}
