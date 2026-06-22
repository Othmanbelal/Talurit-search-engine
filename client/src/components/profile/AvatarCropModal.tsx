import { useCallback, useState, type ReactElement } from "react";
import CropperDefault from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Check, X, ZoomIn } from "lucide-react";

// react-easy-crop ships its value default only in the ESM `.d.mts`; under the
// project's classic "Node" module resolution TS resolves the type-only `.d.ts`,
// so we re-type the (runtime-correct) default export to the props we use.
type CropperProps = {
  image: string;
  crop: { x: number; y: number };
  zoom: number;
  aspect: number;
  cropShape?: "rect" | "round";
  showGrid?: boolean;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (area: Area, areaPixels: Area) => void;
};
const Cropper = CropperDefault as unknown as (props: CropperProps) => ReactElement;

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => Promise<void> | void;
};

export function AvatarCropModal({ imageSrc, onCancel, onCropped }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => setAreaPixels(pixels), []);

  async function confirm() {
    if (!areaPixels) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(imageSrc, areaPixels);
      await onCropped(blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-slate-900 shadow-industrial">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Adjust photo</h3>
          <button className="rounded-md p-1 text-slate-400 hover:text-white" onClick={onCancel} type="button" aria-label="Cancel">
            <X size={18} />
          </button>
        </header>

        <div className="relative h-72 bg-slate-950">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 px-5 py-3">
          <ZoomIn className="text-slate-400" size={16} />
          <input
            className="flex-1 accent-[var(--accent,#f0a500)]"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </div>

        <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">
          <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent" onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            disabled={busy || !areaPixels}
            onClick={() => void confirm()}
            type="button"
          >
            <Check size={15} /> {busy ? "Saving..." : "Save photo"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Crop the source image to the selected square and export a JPEG blob. */
async function cropToBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const size = Math.max(1, Math.round(area.width));
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not export image."))),
      "image/jpeg",
      0.9,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Could not load image.")));
    image.src = src;
  });
}
