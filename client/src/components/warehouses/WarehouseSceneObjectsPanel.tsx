import { Box, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useWarehouseSceneObjects } from "../../hooks/useWarehouseSceneObjects";
import { getLocationCodesRequest } from "../../services/warehouse.service";
import type { WarehouseSceneObject, WarehouseShelf } from "../../types/warehouse";
import { WarehouseRackSlotDesigner } from "./WarehouseRackSlotDesigner";

type Props = {
  canEdit: boolean;
  onGenerated: (shelves: WarehouseShelf[]) => void;
  shelves: WarehouseShelf[];
  warehouseId: string;
};

export function WarehouseSceneObjectsPanel({ canEdit, onGenerated, shelves, warehouseId }: Props) {
  const scene = useWarehouseSceneObjects(warehouseId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [locationCodes, setLocationCodes] = useState<string[]>([]);

  useEffect(() => {
    getLocationCodesRequest(warehouseId).then((r) => setLocationCodes(r.codes)).catch(() => undefined);
  }, [warehouseId]);

  if (scene.isLoading) return <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />;

  return (
    <section className="space-y-3 rounded-lg border border-line bg-slate-950/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Rack slot configuration</h3>
          <p className="text-sm text-slate-400">Click a rack to configure its shelf levels and assign location codes to slots.</p>
        </div>
        <span className="rounded-full border border-line px-3 py-1 text-xs text-slate-300">{scene.sceneObjects.length} racks</span>
      </div>

      {scene.error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{scene.error}</p> : null}
      {scene.sceneObjects.length === 0 ? (
        <p className="rounded-md border border-line bg-white/[0.03] p-3 text-sm text-slate-400">
          Design the warehouse in the 3D editor and save it — racks will appear here for slot configuration.
        </p>
      ) : null}

      <div className="space-y-2">
        {scene.sceneObjects.map((object) => {
          const isOpen = expanded === object.externalObjectId;
          return (
            <div className="rounded-md border border-line bg-white/[0.03]" key={object.externalObjectId}>
              <button
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setExpanded(isOpen ? null : object.externalObjectId)}
                type="button"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Box className="shrink-0 text-accent" size={16} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{object.name}</p>
                    <p className="text-xs text-slate-400">
                      {object.objectType} · {object.width} × {object.depth} × {object.height} m
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-1 text-xs text-slate-300">
                    <Link2 size={12} /> {object.linkedShelfCount} levels
                  </span>
                  {canEdit ? (
                    isOpen
                      ? <ChevronUp className="text-accent" size={16} />
                      : <ChevronDown className="text-slate-400" size={16} />
                  ) : null}
                </div>
              </button>

              {isOpen && canEdit ? (
                <div className="border-t border-line px-3 pb-3 pt-3">
                  <WarehouseRackSlotDesigner
                    availableCodes={locationCodes}
                    existingShelves={shelves}
                    key={object.externalObjectId}
                    object={object}
                    onCancel={() => setExpanded(null)}
                    onSave={async (input) => {
                      const result = await scene.saveRackSlotLayout(input);
                      if (result) {
                        onGenerated(result);
                        setExpanded(null);
                      }
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
