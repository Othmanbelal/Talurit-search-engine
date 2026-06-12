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
        className={`fixed left-1/2 top-1/2 z-50 flex ${maxWidth} w-[calc(100%-2rem)] max-h-[65vh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-line bg-slate-950 shadow-2xl overflow-hidden`}
      >
        {children}
      </div>
    </>
  );
}
