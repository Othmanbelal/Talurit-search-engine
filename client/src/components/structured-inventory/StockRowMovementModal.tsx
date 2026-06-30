import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listUsedInCardsRequest } from "../../services/used-in.service";
import type { StockMovementInput, StructuredStockRow, UseInCardInput } from "../../types/structured-inventory";
import type { UsedInCard } from "../../types/used-in";

export function StockRowMovementModal({
  onClose,
  onTake,
  onUseIn,
  row,
}: {
  onClose: () => void;
  onTake: (rowId: string, input: StockMovementInput) => Promise<void>;
  onUseIn: (rowId: string, input: UseInCardInput) => Promise<void>;
  row: StructuredStockRow | null;
}) {
  const { t } = useTranslation("inventory");
  const [cards, setCards] = useState<UsedInCard[]>([]);
  const [mode, setMode] = useState<"take" | "use_in">("take");
  const [quantity, setQuantity] = useState(1);
  const [cardId, setCardId] = useState("");
  const [spotIds, setSpotIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedCard = cards.find((card) => card.id === cardId) ?? null;
  const emptySpots = useMemo(() => selectedCard?.spots.filter((spot) => !spot.isOccupied) ?? [], [selectedCard]);

  useEffect(() => {
    if (!row) return;
    listUsedInCardsRequest().then((result) => {
      setCards(result.cards);
      setCardId(result.cards[0]?.id ?? "");
    }).catch((requestError) => setError(requestError instanceof Error ? requestError.message : t("movement.usedInCard")));
  }, [row]);

  if (!row) return null;
  const activeRow = row;

  async function submit() {
    setError(null);
    if (quantity > activeRow.quantity) return setError(t("movement.onlyAvailable", { qty: activeRow.quantity, unit: activeRow.unit }));
    if (mode === "use_in" && !cardId) return setError(t("movement.selectCard"));
    if (mode === "use_in" && selectedCard?.spots.length && spotIds.length !== quantity) {
      return setError(t("movement.selectSpots", { count: quantity }));
    }
    setIsSaving(true);
    try {
      if (mode === "take") await onTake(activeRow.id, { quantity });
      if (mode === "use_in") await onUseIn(activeRow.id, { quantity, cardId, spotIds });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("movement.movementFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <section className="w-full max-w-xl rounded-lg border border-line bg-slate-950 p-5 shadow-2xl">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t("movement.sectionLabel")}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{activeRow.item.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{t("movement.available", { qty: activeRow.quantity, unit: activeRow.unit })}</p>
          </div>
          <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300" onClick={onClose} type="button"><X size={18} /></button>
        </header>
        {error ? <div className="mt-4 rounded border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
        <div className="mt-5 grid gap-3">
          <ModeTabs mode={mode} onChange={setMode} />
          <NumberField label={t("movement.quantity")} onChange={setQuantity} value={quantity} />
          {mode === "use_in" ? <CardFields cards={cards} cardId={cardId} emptySpots={emptySpots} quantity={quantity} selected={spotIds} setCardId={setCardId} setSelected={setSpotIds} /> : null}
        </div>
        <footer className="mt-5 flex justify-end gap-2">
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-200" onClick={onClose} type="button">{t("movement.cancel")}</button>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isSaving} onClick={() => void submit()} type="button">
            {mode === "take" ? t("movement.take") : t("movement.useIn")}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ModeTabs({ mode, onChange }: { mode: "take" | "use_in"; onChange: (mode: "take" | "use_in") => void }) {
  const { t } = useTranslation("inventory");
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {(["take", "use_in"] as const).map((option) => (
        <button className={`rounded-md border px-3 py-2 text-sm font-semibold ${mode === option ? "border-accent bg-accent/15 text-accent" : "border-line text-slate-300"}`} key={option} onClick={() => onChange(option)} type="button">
          {option === "take" ? t("movement.take") : t("movement.useIn")}
        </button>
      ))}
    </div>
  );
}

function CardFields({ cardId, cards, emptySpots, quantity, selected, setCardId, setSelected }: {
  cardId: string;
  cards: UsedInCard[];
  emptySpots: UsedInCard["spots"];
  quantity: number;
  selected: string[];
  setCardId: (value: string) => void;
  setSelected: (value: string[]) => void;
}) {
  const { t } = useTranslation("inventory");
  return (
    <>
      <SelectField label={t("movement.usedInCard")} onChange={(value) => { setCardId(value); setSelected([]); }} options={cards.map((card) => ({ label: card.name, value: card.id }))} value={cardId} />
      {emptySpots.length > 0 ? Array.from({ length: quantity }).map((_, index) => (
        <SelectField
          key={index}
          label={t("movement.spot", { index: index + 1 })}
          onChange={(value) => setSelected(selected.map((spotId, spotIndex) => spotIndex === index ? value : spotId).concat(index >= selected.length ? [value] : []).slice(0, quantity))}
          options={emptySpots.filter((spot) => !selected.includes(spot.id) || selected[index] === spot.id).map((spot) => ({ label: spot.name, value: spot.id }))}
          value={selected[index] ?? ""}
        />
      )) : null}
    </>
  );
}

function NumberField({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label>
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <input className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" min={1} onChange={(event) => onChange(Number(event.target.value || 1))} type="number" value={value} />
    </label>
  );
}

function SelectField({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: { label: string; value: string }[]; value: string }) {
  const { t } = useTranslation("inventory");
  return (
    <label>
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <select className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">{t("movement.select")}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
