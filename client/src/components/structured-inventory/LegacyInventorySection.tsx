import { Database, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { DynamicInventory } from "../../types/inventory";

export function LegacyInventorySection({ inventories }: { inventories: DynamicInventory[] }) {
  if (inventories.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-white">Legacy dynamic imports</h2>
        <p className="mt-1 text-sm text-slate-400">Old generic Excel tables are still available.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {inventories.map((inventory) => (
          <article className="rounded-lg border border-line bg-panel p-5 shadow-industrial" key={inventory.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
                <Database size={21} />
              </div>
              <Link
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white/5 text-slate-300 hover:border-accent hover:text-accent"
                to={`/inventory/${inventory.id}`}
              >
                <ArrowRight size={17} />
              </Link>
            </div>
            <h3 className="mt-5 truncate text-xl font-semibold text-white">{inventory.name}</h3>
            <div className="mt-2 text-sm text-slate-400">{inventory.sourceSheetName ?? "Imported table"}</div>
            <div className="mt-4 text-sm text-slate-300">
              {inventory._count?.rows ?? 0} rows · {inventory._count?.columns ?? 0} columns
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
