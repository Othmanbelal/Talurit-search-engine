import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { Camera, Search, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type Props = {
  onClose: () => void;
  onCode: (code: string) => Promise<void>;
};

export function WarehouseSlotQrScanner({ onClose, onCode }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scannedRef = useRef(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
    // Camera should start once when this modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    try {
      const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.TRY_HARDER, true]]);
      const reader = new BrowserQRCodeReader(hints);
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        videoRef.current ?? undefined,
        (result) => {
          const text = result?.getText();
          if (!text || scannedRef.current) return;
          scannedRef.current = true;
          stopCamera();
          void submitCode(text);
        },
      );
    } catch {
      setError("Camera could not be opened. Enter the QR value manually.");
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }

  async function submitCode(code: string) {
    setIsBusy(true);
    setError(null);
    try {
      await onCode(code.trim());
      onClose();
    } catch (caught) {
      scannedRef.current = false;
      setError(caught instanceof Error ? caught.message : "QR lookup failed.");
    } finally {
      setIsBusy(false);
    }
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    if (!manualCode.trim()) return;
    stopCamera();
    void submitCode(manualCode);
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4">
      <section className="w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-slate-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Assign by QR</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Scan linked inventory item</h2>
          </div>
          <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>
        <div className="space-y-4 p-5">
          <div className="relative overflow-hidden rounded-lg border border-line bg-black">
            <video className="aspect-video w-full object-cover" muted playsInline ref={videoRef} />
            <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-black/60 px-3 py-1 text-xs text-emerald-100">
              <Camera size={14} /> Camera
            </span>
          </div>
          <form className="flex gap-2" onSubmit={submitManual}>
            <input className="min-w-0 flex-1 rounded-md border border-line bg-slate-900 px-3 py-2 text-sm text-white" onChange={(event) => setManualCode(event.target.value)} placeholder="Or enter QR value manually" value={manualCode} />
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isBusy || !manualCode.trim()} type="submit">
              <Search size={15} /> Lookup
            </button>
          </form>
          {error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
