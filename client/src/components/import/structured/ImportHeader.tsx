import { Database } from "lucide-react";

export function ImportHeader() {
  return (
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Structured Excel import
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
          Import inventory with mappings
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Scan sheets, choose grouping, map columns, stage rows, fix warnings, then write clean inventory data.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white/5 px-4 py-3 text-sm text-slate-300">
        <Database className="text-accent" size={17} /> Grouped, not merged
      </div>
    </header>
  );
}
