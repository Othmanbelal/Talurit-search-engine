import { lazy, Suspense } from "react";
import type { ProjectData } from "../../modules/warehouse-designer/types";
import type { WarehouseLayout } from "../../types/warehouse";

const WarehouseDesignerStudio = lazy(() => import("../../modules/warehouse-designer/App"));

type Props = {
  canEdit: boolean;
  onSaveLayout: (layoutData: Record<string, unknown>) => Promise<void>;
  warehouse: WarehouseLayout;
};

export function WarehouseDesignerPanel({ canEdit, onSaveLayout, warehouse }: Props) {
  async function saveProject(project: ProjectData) {
    // The designer exports a normalized project object; the backend stores it as layoutData JSON.
    await onSaveLayout(project as unknown as Record<string, unknown>);
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-xl font-semibold text-white">3D warehouse designer</h2>
          <p className="text-sm text-slate-400">
            Design the warehouse here and save it directly to the database.
          </p>
        </div>
        {!canEdit ? <span className="rounded-md border border-line px-3 py-2 text-sm text-slate-300">Read only</span> : null}
      </div>
      <Suspense fallback={<DesignerLoading />}>
        <WarehouseDesignerStudio
          fallbackProjectName={warehouse.name}
          initialLayout={warehouse.layoutData}
          onSave={canEdit ? saveProject : undefined}
          readOnly={!canEdit}
        />
      </Suspense>
    </section>
  );
}

function DesignerLoading() {
  return <div className="h-[680px] animate-pulse rounded-2xl border border-line bg-white/[0.04]" />;
}
