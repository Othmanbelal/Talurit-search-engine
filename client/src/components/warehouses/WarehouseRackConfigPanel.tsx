import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "../Modal";
import { useWarehouseSceneObjects } from "../../hooks/useWarehouseSceneObjects";
import { useWarehouseShelves } from "../../hooks/useWarehouseShelves";
import { WarehouseRackSlotDesigner } from "./WarehouseRackSlotDesigner";

type Props = {
  onClose: () => void;
  onSaved: () => void;
  selectedRackId: string;
  warehouseId: string;
};

export function WarehouseRackConfigPanel({ onClose, onSaved, selectedRackId, warehouseId }: Props) {
  const { t } = useTranslation("warehouses");
  const scene = useWarehouseSceneObjects(warehouseId);
  const shelves = useWarehouseShelves(warehouseId);

  const object = scene.sceneObjects.find((o) => o.externalObjectId === selectedRackId);

  return (
    <Modal maxWidth="max-w-4xl" onClose={onClose}>
      <header className="flex shrink-0 items-center justify-between border-b border-line px-6 py-4">
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-accent">{t("rack.configuration")}</p>
        <button className="rounded-md border border-line p-1.5 text-slate-400 hover:border-accent hover:text-accent" onClick={onClose} type="button">
          <X size={16} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        {scene.isLoading || shelves.isLoading ? (
          <div className="h-40 animate-pulse rounded-lg border border-line bg-white/5" />
        ) : !object ? (
          <p className="rounded-md border border-line bg-white/[0.03] p-3 text-sm text-slate-400">
            {t("rack.notFound")}
          </p>
        ) : (
          <WarehouseRackSlotDesigner
            existingShelves={shelves.shelves}
            key={selectedRackId}
            object={object}
            onCancel={onClose}
            onSave={async (input) => {
              const result = await scene.saveRackSlotLayout(input);
              if (result) { onSaved(); onClose(); }
            }}
          />
        )}
      </div>
    </Modal>
  );
}
