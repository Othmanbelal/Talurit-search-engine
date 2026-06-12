import { ArrowLeft, Save } from "lucide-react";
import { lazy, Suspense, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingProjectRef = useRef<ProjectData | null>(null);

  async function handleSave(project: ProjectData) {
    pendingProjectRef.current = project;
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Warehouse name is required."); return; }
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
      setError("Failed to create warehouse. Please try again.");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-7xl">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to="/warehouses">
          <ArrowLeft size={16} /> Warehouses
        </Link>
      </div>
      <div className="mx-auto max-w-7xl space-y-5">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">New warehouse</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Design a new warehouse</h1>
          <p className="mt-2 text-sm text-slate-400">Design the layout, then save to create the warehouse entry.</p>
        </header>

        <section className="grid gap-4 rounded-lg border border-line bg-panel p-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Warehouse name <span className="text-accent">*</span>
            <input
              className="mt-2 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main warehouse A"
              type="text"
              value={name}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            Description
            <input
              className="mt-2 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500"
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
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
            <Save size={16} /> {isSaving ? "Creating…" : "Save & create warehouse"}
          </button>
        </div>

        <Suspense fallback={<DesignerLoading />}>
          <WarehouseDesignerStudio
            fallbackProjectName={name.trim() || "New warehouse"}
            onSave={handleSave}
          />
        </Suspense>
      </div>
    </div>
  );
}

function EditDesignPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const warehouse = useWarehouse(id);
  const [isDone, setIsDone] = useState(false);
  const requestSaveRef = useRef<(() => Promise<void>) | null>(null);

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

  return (
    <div className="space-y-5">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to={`/warehouses/${id}`}>
          <ArrowLeft size={16} /> Back to warehouse
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          disabled={isDone}
          onClick={() => void handleDoneEditing()}
          type="button"
        >
          <ArrowLeft size={16} /> {isDone ? "Saving…" : "Done editing"}
        </button>
      </div>
      <div className="mx-auto max-w-7xl space-y-3">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Editing design</p>
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

function DesignerLoading() {
  return <div className="h-[680px] animate-pulse rounded-2xl border border-line bg-white/[0.04]" />;
}
