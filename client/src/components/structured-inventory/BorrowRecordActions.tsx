import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  acceptBorrowRequestRequest,
  cancelBorrowRequestRequest,
  createBorrowRequestRequest,
  declineBorrowRequestRequest,
} from "../../services/borrow-requests.service";
import { returnBorrowedItemRequest } from "../../services/structured-inventory.service";
import { useAuth } from "../../hooks/useAuth";
import type { BorrowedItem } from "../../types/structured-inventory";

export function BorrowRecordActions({ item, onChanged }: { item: BorrowedItem; onChanged: () => void }) {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const [quantity, setQuantity] = useState(item.quantity);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isHolder = item.currentHolder?.id === user?.id;
  const canResolve = isHolder || user?.role === "admin" || user?.role === "manager";

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("borrowedItems.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (item.pendingRequest) {
    const pendingRequest = item.pendingRequest;
    const isRequester = pendingRequest.requesterId === user?.id;
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-amber-300">
          {t("borrowedItems.requestedBy", { name: pendingRequest.requesterName })}
        </span>
        <div className="flex gap-2">
          {isRequester ? (
            <ActionButton busy={busy} label={t("borrowedItems.cancelRequest")} onClick={() => void run(() => cancelBorrowRequestRequest(pendingRequest.id))} />
          ) : null}
          {!isRequester && canResolve ? (
            <>
              <ActionButton busy={busy} label={t("borrowedItems.accept")} onClick={() => void run(() => acceptBorrowRequestRequest(pendingRequest.id))} />
              <ActionButton busy={busy} label={t("borrowedItems.decline")} onClick={() => void run(() => declineBorrowRequestRequest(pendingRequest.id))} />
            </>
          ) : null}
        </div>
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    );
  }

  if (isHolder) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            className="w-16 rounded-md border border-line bg-slate-950/70 px-2 py-1 text-xs text-white"
            max={item.quantity}
            min={1}
            onChange={(event) => setQuantity(Number(event.target.value || 1))}
            type="number"
            value={quantity}
          />
          <ActionButton busy={busy} label={t("borrowedItems.return")} onClick={() => void run(() => returnBorrowedItemRequest(item.id, quantity))} />
        </div>
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ActionButton busy={busy} label={t("borrowedItems.request")} onClick={() => void run(() => createBorrowRequestRequest(item.id))} />
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}

function ActionButton({ busy, label, onClick }: { busy: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-accent hover:text-accent disabled:opacity-50"
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {busy ? "…" : label}
    </button>
  );
}
