import { FileSpreadsheet } from "lucide-react";
import { Link } from "react-router-dom";

export function StructuredInventoryHeader() {
  return (
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Inventory</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Inventory groups</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Structured imports are shown as groups and separate sheet tables. Grouping never merges sheets.
        </p>
      </div>
      <Link
        className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950"
        to="/import"
      >
        <FileSpreadsheet size={17} /> Import Excel
      </Link>
    </header>
  );
}
