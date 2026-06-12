import { useWarehouseSceneObjects } from "../../hooks/useWarehouseSceneObjects";
import type { WarehouseLayout } from "../../types/warehouse";
import { WarehousePlanView } from "./WarehousePlanView";

type Props = {
  canEdit: boolean;
  onRackSelect: (id: string) => void;
  selectedRackId: string | null;
  warehouse: WarehouseLayout;
};

export function WarehouseShelvesPanel({ canEdit, onRackSelect, selectedRackId, warehouse }: Props) {
  const scene = useWarehouseSceneObjects(warehouse.id);

  return (
    <section className="space-y-4">
      {scene.error ? (
        <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{scene.error}</p>
      ) : null}
      {scene.isLoading ? (
        <div className="h-48 animate-pulse rounded-lg border border-line bg-white/5" />
      ) : (
        <WarehousePlanView
          layoutData={warehouse.layoutData as Record<string, unknown>}
          onRackSelect={canEdit ? onRackSelect : undefined}
          sceneObjects={scene.sceneObjects}
          selectedRackId={selectedRackId}
          warehouseName={warehouse.name}
        />
      )}
    </section>
  );
}
