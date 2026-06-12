import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  maxWidth?: string;
  onClose?: () => void;
};

export function Modal({ children, maxWidth = "max-w-3xl", onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={[
          "fixed z-50 flex flex-col overflow-hidden bg-slate-950 shadow-2xl",
          // Mobile: full-screen, no rounding
          "inset-0",
          // sm+: centered panel with max dimensions
          `sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-line sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:${maxWidth}`,
        ].join(" ")}
      >
        {children}
      </div>
    </>
  );
}
