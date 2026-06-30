import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { Camera, RotateCcw, Search, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null | "stopped">(null);
  const scannedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<QrScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isCameraLoading, setIsCameraLoading] = useState(true);
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
    setIsCameraLoading(true);
    scannedRef.current = false;
    try {
      // TRY_HARDER improves detection for codes that are partially obscured or off-angle.
      const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.TRY_HARDER, true]]);
      const reader = new BrowserQRCodeReader(hints);
      // Request 720p so there are enough pixels to resolve small QR codes.
      // facingMode ideal "environment" prefers rear camera on mobile, falls back to webcam on desktop.
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      };
      const controls = await reader.decodeFromConstraints(constraints, videoRef.current ?? undefined, (scanResult) => {
        const text = scanResult?.getText();
        if (!text || scannedRef.current) return;
        scannedRef.current = true;
        stopCamera();
        void lookup(text);
      });
      // If the modal was closed while the camera was initialising, stop immediately.
      if (controlsRef.current === "stopped") {
        controls.stop();
      } else {
        controlsRef.current = controls;
        setIsCameraLoading(false);
      }
    } catch {
      setIsScanning(false);
      setIsCameraLoading(false);
      setError(t("cameraError"));
    }
  }

  function stopCamera() {
    if (controlsRef.current && controlsRef.current !== "stopped") {
      controlsRef.current.stop();
    }
    controlsRef.current = "stopped";
    setIsScanning(false);
  }

  async function lookup(code: string) {
    setIsLookingUp(true);
    setError(null);
    try {
      setResult(await scanQrCodeRequest(code));
      setManualCode(code);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("qrLookupFailed"));
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
    setError(null);
    controlsRef.current = null;
    void startCamera();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4">
      <section className="flex h-full w-full flex-col overflow-hidden bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-xl sm:border sm:border-line">
        <header className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t("qrScanner")}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{t("scanInventoryItem")}</h2>
            <p className="mt-1 text-sm text-slate-400">{t("pointCameraAtQr")}</p>
          </div>
          <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={onClose} type="button" aria-label={t("close")}>
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="relative overflow-hidden rounded-lg border border-line bg-black">
            <video className="aspect-video w-full object-cover" muted playsInline ref={videoRef} />
            {isCameraLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <p className="text-sm text-slate-400">{t("startingCamera")}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${isScanning ? "border-emerald-400/40 text-emerald-200" : "border-line text-slate-400"}`}>
              <Camera size={14} /> {isScanning ? t("scanning") : t("cameraStopped")}
            </span>
            {result ? (
              <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-slate-200 hover:border-accent" onClick={scanAgain} type="button">
                <RotateCcw size={14} /> {t("scanAgain")}
              </button>
            ) : null}
          </div>

          <form className="flex gap-2" onSubmit={submitManual}>
            <input
              className="min-w-0 flex-1 rounded-md border border-line bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500"
              onChange={(event) => setManualCode(event.target.value)}
              placeholder={t("manualCodePlaceholder")}
              value={manualCode}
            />
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isLookingUp || !manualCode.trim()} type="submit">
              <Search size={15} /> {t("lookup")}
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
