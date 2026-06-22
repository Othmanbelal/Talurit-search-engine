import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";
type Toast = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  notify: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (message) => notify(message, "success"),
      error: (message) => notify(message, "error"),
      info: (message) => notify(message, "info"),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider.");
  return context;
}

const VARIANT_STYLES: Record<ToastVariant, { ring: string; icon: React.ReactNode }> = {
  success: { ring: "border-emerald-400/30", icon: <CheckCircle2 className="text-emerald-300" size={18} /> },
  error: { ring: "border-red-400/30", icon: <XCircle className="text-red-300" size={18} /> },
  info: { ring: "border-accent/30", icon: <Info className="text-accent" size={18} /> },
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const style = VARIANT_STYLES[toast.variant];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border ${style.ring} bg-slate-900/85 p-3.5 text-sm text-slate-100 shadow-industrial backdrop-blur-md animate-[fadeIn_0.18s_ease-out]`}
            role="status"
          >
            <span className="mt-0.5 shrink-0">{style.icon}</span>
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              onClick={() => onDismiss(toast.id)}
              type="button"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
