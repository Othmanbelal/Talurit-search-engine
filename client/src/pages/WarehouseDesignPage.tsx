import { ArrowLeft, Save, Warehouse } from "lucide-react";
import { lazy, Suspense, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "../hooks/useIsMobile";
import { useWarehouse } from "../hooks/useWarehouses";
import { createWarehouseRequest } from "../services/warehouse.service";
import type { ProjectData } from "../modules/warehouse-designer/types";

const WarehouseDesignerStudio = lazy(() => import("../modules/warehouse-designer/App"));

/**
 * /warehouses/new  → create mode: name input + designer, Save creates warehouse and redirects
 * /warehouses/:id/design → edit mode: loads existing layout, Save updates layoutData
 */
export function WarehouseDesignPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);
  return isEditMode ? <EditDesignPage id={id!} /> : <CreateDesignPage />;
}

function CreateDesignPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { t } = useTranslation("warehouses");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingProjectRef = useRef<ProjectData | null>(null);

  if (isMobile) return <MobileGate />;

  async function handleSave(project: ProjectData) {
    pendingProjectRef.current = project;
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setError(t("create.nameRequired")); return; }
    setIsSaving(true);
    setError(null);
    try {
      const layoutData = pendingProjectRef.current as unknown as Record<string, unknown> | undefined;
      const result = await createWarehouseRequest({
        name: trimmed,
        description: description.trim() || null,
        layoutData,
      });
      navigate(`/warehouses/${result.warehouse.id}`);
    } catch {
      setError(t("create.failedToCreate"));
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-7xl">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to="/warehouses">
          <ArrowLeft size={16} /> {t("sectionLabel")}
        </Link>
      </div>
      <div className="mx-auto max-w-7xl space-y-5">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("create.newWarehouseLabel")}</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">{t("create.designNew")}</h1>
          <p className="mt-2 text-sm text-slate-400">{t("create.designDescription")}</p>
        </header>

        <section className="grid gap-4 rounded-lg border border-line bg-panel p-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            {t("create.nameLabel")} <span className="text-accent">*</span>
            <input
              className="mt-2 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
              onChange={(e) => setName(e.target.value)}
              placeholder={t("create.namePlaceholder")}
              type="text"
              value={name}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            {t("create.descriptionOptional")}
            <input
              className="mt-2 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("create.optional")}
              type="text"
              value={description}
            />
          </label>
        </section>

        {error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}

        <div className="flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
            disabled={isSaving}
            onClick={() => void handleCreate()}
            type="button"
          >
            <Save size={16} /> {isSaving ? t("create.creating") : t("create.saveAndCreate")}
          </button>
        </div>

        <Suspense fallback={<DesignerLoading />}>
          <WarehouseDesignerStudio
            fallbackProjectName={name.trim() || t("create.newWarehouse")}
            onSave={handleSave}
          />
        </Suspense>
      </div>
    </div>
  );
}

function EditDesignPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation("warehouses");
  const warehouse = useWarehouse(id);
  const [isDone, setIsDone] = useState(false);
  const requestSaveRef = useRef<(() => Promise<void>) | null>(null);
  const isMobile = useIsMobile();

  async function handleSave(project: ProjectData) {
    await warehouse.saveLayout(project as unknown as Record<string, unknown>);
  }

  async function handleDoneEditing() {
    setIsDone(true);
    try {
      if (requestSaveRef.current) await requestSaveRef.current();
    } finally {
      navigate(`/warehouses/${id}`);
    }
  }

  if (warehouse.isLoading) return <DesignerLoading />;
  if (warehouse.error) return (
    <section className="mx-auto max-w-7xl rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
      {warehouse.error}
    </section>
  );
  if (!warehouse.warehouse) return null;

  if (isMobile) return <MobileGate />;

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to={`/warehouses/${id}`}>
          <ArrowLeft size={16} /> {t("create.backToWarehouse")}
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          disabled={isDone}
          onClick={() => void handleDoneEditing()}
          type="button"
        >
          <ArrowLeft size={16} /> {isDone ? t("create.savingDone") : t("create.doneEditing")}
        </button>
      </div>
      <div className="mx-auto max-w-7xl space-y-3">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("create.editingDesign")}</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">{warehouse.warehouse.name}</h1>
        </header>
        <Suspense fallback={<DesignerLoading />}>
          <WarehouseDesignerStudio
            fallbackProjectName={warehouse.warehouse.name}
            initialLayout={warehouse.warehouse.layoutData}
            onSave={handleSave}
            requestSaveRef={requestSaveRef}
          />
        </Suspense>
      </div>
    </div>
  );
}

function MobileGate() {
  const { t } = useTranslation("warehouses");
  return (
    <div className="mx-auto max-w-7xl">
      <div className="rounded-xl border border-line bg-panel p-10 text-center">
        <Warehouse className="mx-auto text-accent" size={40} />
        <h2 className="mt-4 text-xl font-semibold text-white">{t("create.desktopOnly")}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          {t("create.desktopOnlyDescription")}
        </p>
      </div>
    </div>
  );
}

function DesignerLoading() {
  return <div className="h-[680px] animate-pulse rounded-2xl border border-line bg-white/[0.04]" />;
}
