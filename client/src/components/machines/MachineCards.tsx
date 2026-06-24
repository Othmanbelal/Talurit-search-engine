import { ArrowRight, Cpu, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { MachineWithSlotCount } from "../../types/machines";

type MachineCardsProps = {
  canManage: boolean;
  isLoading: boolean;
  machines: MachineWithSlotCount[];
  onDelete: (machine: MachineWithSlotCount) => void;
};

export function MachineCards({ canManage, isLoading, machines, onDelete }: MachineCardsProps) {
  const { t } = useTranslation("machines");

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="h-40 animate-pulse rounded-lg border border-line bg-white/5" key={index} />
        ))}
      </div>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {machines.map((machine) => (
        <article
          className="rounded-lg border border-line bg-panel p-5 shadow-industrial transition hover:border-accent"
          key={machine.id}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
              <Cpu size={21} />
            </div>
            <div className="flex gap-2">
              {canManage ? (
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white/5 text-slate-300 hover:border-red-400 hover:text-red-300"
                  onClick={() => onDelete(machine)}
                  title={t("cards.delete")}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
              <Link
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white/5 text-slate-300 hover:border-accent hover:text-accent"
                title={t("cards.viewDetails")}
                to={`/machines/${machine.id}`}
              >
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <h2 className="mt-5 text-xl font-semibold text-white">{machine.name}</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <Count label={t("details.itemsInMachine")} value={machine.inventoryCount} />
          </div>
        </article>
      ))}
    </section>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-white/[0.04] p-3">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}
