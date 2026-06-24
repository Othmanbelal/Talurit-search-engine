import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cpu } from "lucide-react";
import { MachineCards } from "../components/machines/MachineCards";
import { useAuth } from "../hooks/useAuth";
import { useMachines } from "../hooks/useMachines";
import type { MachineWithSlotCount } from "../types/machines";

export function MachinesPage() {
  const { t } = useTranslation("machines");
  const { user } = useAuth();
  const { createMachine, deleteMachine, error, isLoading, machines } = useMachines();
  const [machineName, setMachineName] = useState("");
  const [description, setDescription] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const canManage = user?.role === "admin" || user?.role === "manager";
  const canDelete = user?.role === "admin";

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionError(null);

    try {
      await createMachine({ name: machineName, description });
      setMachineName("");
      setDescription("");
    } catch (createError) {
      setActionError(createError instanceof Error ? createError.message : t("error.createFailed"));
    }
  }

  async function handleDelete(machine: MachineWithSlotCount) {
    const confirmed = window.confirm(t("confirmDelete", { name: machine.name }));

    if (!confirmed) return;
    setActionError(null);

    try {
      await deleteMachine(machine.id);
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : t("error.deleteFailed"));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            {t("sectionLabel")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-white/5 px-4 py-3 text-sm text-slate-300">
          <Cpu className="text-accent" size={17} />
          {t("count", { count: machines.length })}
        </div>
      </header>

      {error ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      {actionError ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {actionError}
        </section>
      ) : null}

      {canManage ? (
        <form
          className="grid gap-3 rounded-lg border border-line bg-panel p-4 shadow-industrial lg:grid-cols-[1fr_2fr_auto]"
          onSubmit={handleCreate}
        >
          <input
            className="rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
            onChange={(event) => setMachineName(event.target.value)}
            placeholder={t("form.namePlaceholder")}
            required
            value={machineName}
          />
          <input
            className="rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("form.descriptionPlaceholder")}
            value={description}
          />
          <button
            className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950"
            type="submit"
          >
            {t("form.submit")}
          </button>
        </form>
      ) : null}

      <MachineCards
        canManage={canDelete}
        isLoading={isLoading}
        machines={machines}
        onDelete={(machine) => void handleDelete(machine)}
      />
    </div>
  );
}
