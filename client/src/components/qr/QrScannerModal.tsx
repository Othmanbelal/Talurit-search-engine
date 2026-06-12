import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera, RotateCcw, Search, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { scanQrCodeRequest } from "../../services/qr-scan.service";
import type { QrScanResult, QrScanRow } from "../../types/qr-scan";
import { QrScanResultCard } from "./QrScanResultCard";

type Props = {
  canMove?: boolean;
  canWrite?: boolean;
  onClose: () => void;
  onMove: (row: QrScanRow) => Promise<void>;
};

export function QrScannerModal({ canMove = true, canWrite = true, onClose, onMove }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<QrScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
    // Camera setup should only run when the modal mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError(null);
    setIsScanning(true);
    scannedRef.current = false;
    try {
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (scanResult) => {
        const text = scanResult?.getText();
        if (!text || scannedRef.current) return;
        scannedRef.current = true;
        stopCamera();
        void lookup(text);
      });
    } catch {
      setIsScanning(false);
      setError("Camera could not be opened. Check browser permissions or enter the QR code manually.");
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setIsScanning(false);
  }

  async function lookup(code: string) {
    setIsLookingUp(true);
    setError(null);
    try {
      setResult(await scanQrCodeRequest(code));
      setManualCode(code);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "QR lookup failed.");
    } finally {
      setIsLookingUp(false);
    }
  }

  function submitManual(event: FormEvent) {
    event.preventDefault();
    if (!manualCode.trim()) return;
    stopCamera();
    void lookup(manualCode.trim());
  }

  function scanAgain() {
    setResult(null);
    void startCamera();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-slate-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">QR scanner</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Scan inventory item</h2>
            <p className="mt-1 text-sm text-slate-400">Point the camera at an item QR code.</p>
          </div>
          <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="overflow-hidden rounded-lg border border-line bg-black">
            <video className="aspect-video w-full object-cover" muted playsInline ref={videoRef} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${isScanning ? "border-emerald-400/40 text-emerald-200" : "border-line text-slate-400"}`}>
              <Camera size={14} /> {isScanning ? "Scanning" : "Camera stopped"}
            </span>
            {result ? (
              <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-slate-200 hover:border-accent" onClick={scanAgain} type="button">
                <RotateCcw size={14} /> Scan again
              </button>
            ) : null}
          </div>

          <form className="flex gap-2" onSubmit={submitManual}>
            <input
              className="min-w-0 flex-1 rounded-md border border-line bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Or enter QR code value manually"
              value={manualCode}
            />
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isLookingUp || !manualCode.trim()} type="submit">
              <Search size={15} /> Lookup
            </button>
          </form>

          {error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}
          {isLookingUp ? <div className="h-32 animate-pulse rounded-lg border border-line bg-white/5" /> : null}
          {result ? <QrScanResultCard canMove={canMove} canWrite={canWrite} onClose={onClose} onMove={onMove} result={result} /> : null}
        </div>
      </section>
    </div>
  );
}
