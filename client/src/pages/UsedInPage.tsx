import { ArrowRight, Pencil, Plus, Search, SquareStack, Trash2, X } from "lucide-react";
import { Modal } from "../components/Modal";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { createUsedInCardRequest, deleteUsedInCardRequest, listUsedInCardsRequest, updateUsedInCardRequest } from "../services/used-in.service";
import type { UsedInCard, UsedInSpot } from "../types/used-in";

type DraftSpot = { id?: string; isOccupied?: boolean; name: string };
type DrawerState = { mode: "create"; card?: never } | { mode: "edit"; card: UsedInCard };

export function UsedInPage() {
  const { canManageInventory } = usePermissions();
  const [cards, setCards] = useState<UsedInCard[]>([]);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadCards() {
    listUsedInCardsRequest()
      .then((result) => {
        setCards(result.cards);
        setError(null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Used In cards unavailable"));
  }

  useEffect(loadCards, []);

  async function removeCard(card: UsedInCard) {
    if (!window.confirm(`Delete "${card.name}"? Cards with assigned items must be emptied first.`)) return;
    try {
      await deleteUsedInCardRequest(card.id);
      loadCards();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Card could not be deleted");
    }
  }

  const q = search.trim().toLowerCase();
  const filteredCards = q
    ? cards.filter((card) => card.name.toLowerCase().includes(q) || (card.description ?? "").toLowerCase().includes(q))
    : cards;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Used In</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Usage cards</h1>
          <p className="mt-2 text-sm text-slate-400">Create named places where inventory items can be assigned and returned.</p>
        </div>
        {canManageInventory ? (
          <button className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950" onClick={() => setDrawer({ mode: "create" })} type="button">
            <Plus size={16} /> New card
          </button>
        ) : null}
      </header>

      <div className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.04] px-3 py-2">
        <Search className="shrink-0 text-slate-500" size={16} />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search card name or description..."
          value={search}
        />
      </div>

      {error ? <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</section> : null}
      {filteredCards.length === 0 ? (
        <section className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
          {cards.length === 0 ? "No usage cards created yet." : "No cards match your search."}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCards.map((card) => (
          <UsageCard
            card={card}
            key={card.id}
            onDelete={canManageInventory ? removeCard : undefined}
            onEdit={canManageInventory ? (target) => setDrawer({ mode: "edit", card: target }) : undefined}
          />
        ))}
      </section>

      <CardDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        onSaved={() => {
          setDrawer(null);
          loadCards();
        }}
        setError={setError}
      />
    </div>
  );
}

function UsageCard({ card, onDelete, onEdit }: { card: UsedInCard; onDelete?: (card: UsedInCard) => void; onEdit?: (card: UsedInCard) => void }) {
  const assigned = (card._count?.assignments ?? 0) + (card._count?.stockAssignments ?? 0);
  const occupiedSpots = card.spots.filter((spot) => spot.isOccupied).length;
  return (
    <article className="rounded-lg border border-line bg-panel p-5 shadow-industrial">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
          <SquareStack size={21} />
        </div>
        <div className="flex gap-2">
          {onEdit ? (
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white/5 text-slate-300 hover:border-accent hover:text-accent" onClick={() => onEdit(card)} title="Edit card" type="button">
              <Pencil size={16} />
            </button>
          ) : null}
          {onDelete ? (
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-400/30 bg-red-500/10 text-red-100" onClick={() => onDelete(card)} title="Delete card" type="button">
              <Trash2 size={16} />
            </button>
          ) : null}
          <Link className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white/5 text-slate-300 hover:border-accent hover:text-accent" title="Open card" to={`/used-in/${card.id}`}>
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
      <h2 className="mt-5 truncate text-xl font-semibold text-white">{card.name}</h2>
      <p className="mt-2 min-h-5 text-sm text-slate-400">{card.description || "No description."}</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <Metric label="Assigned" value={assigned} />
        <Metric label="Spots" value={card.spots.length ? `${occupiedSpots}/${card.spots.length}` : "None"} />
      </div>
    </article>
  );
}

function CardDrawer({ onClose, onSaved, setError, state }: {
  onClose: () => void;
  onSaved: () => void;
  setError: (message: string | null) => void;
  state: DrawerState | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prefix, setPrefix] = useState("");
  const [prefixCount, setPrefixCount] = useState(1);
  const [spotName, setSpotName] = useState("");
  const [spots, setSpots] = useState<DraftSpot[]>([]);

  useEffect(() => {
    setName(state?.mode === "edit" ? state.card.name : "");
    setDescription(state?.mode === "edit" ? state.card.description ?? "" : "");
    setSpots(state?.mode === "edit" ? state.card.spots.map(toDraftSpot) : []);
    setPrefix("");
    setPrefixCount(1);
    setSpotName("");
  }, [state]);

  if (!state) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (state?.mode === "edit") {
        await updateUsedInCardRequest(state.card.id, { name, description, spots: spots.map(({ id, name }) => ({ id, name })) });
      } else {
        await createUsedInCardRequest({ name, description, spotNames: spots.map((spot) => spot.name) });
      }
      setError(null);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Card could not be saved");
    }
  }

  function addSpot() {
    const cleanName = spotName.trim();
    if (!cleanName || spots.some((spot) => spot.name.toLowerCase() === cleanName.toLowerCase())) return;
    setSpots((current) => [...current, { name: cleanName }]);
    setSpotName("");
  }

  function addPrefixedSpots() {
    const cleanPrefix = prefix.trim();
    if (!cleanPrefix || prefixCount < 1) return;
    setSpots((current) => {
      const names = new Set(current.map((spot) => spot.name.toLowerCase()));
      const generated = Array.from({ length: prefixCount }, (_, index) => `${cleanPrefix}${index + 1}`)
        .filter((name) => !names.has(name.toLowerCase()))
        .map((name) => ({ name }));
      return [...current, ...generated];
    });
  }

  return (
    <Modal maxWidth="max-w-3xl" onClose={onClose}>
      <header className="flex shrink-0 items-start justify-between border-b border-line p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Usage card</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{state.mode === "edit" ? "Edit card" : "New card"}</h2>
        </div>
        <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={onClose} type="button"><X size={18} /></button>
      </header>
      <form className="flex flex-1 flex-col overflow-hidden" onSubmit={submit}>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <Field label="Card name" onChange={setName} placeholder="OKUMA, Service Van 1" required value={name} />
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase text-slate-400">Description</span>
            <textarea className="min-h-24 w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => setDescription(event.target.value)} placeholder="Optional context" value={description} />
          </label>
          <SpotBuilder
            addPrefixedSpots={addPrefixedSpots}
            addSpot={addSpot}
            prefix={prefix}
            prefixCount={prefixCount}
            setPrefix={setPrefix}
            setPrefixCount={setPrefixCount}
            setSpotName={setSpotName}
            setSpots={setSpots}
            spotName={spotName}
            spots={spots}
          />
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-line p-5">
          <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-200" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950" type="submit">Save card</button>
        </footer>
      </form>
    </Modal>
  );
}

function SpotBuilder({ addPrefixedSpots, addSpot, prefix, prefixCount, setPrefix, setPrefixCount, setSpotName, setSpots, spotName, spots }: {
  addPrefixedSpots: () => void;
  addSpot: () => void;
  prefix: string;
  prefixCount: number;
  setPrefix: (value: string) => void;
  setPrefixCount: (value: number) => void;
  setSpotName: (value: string) => void;
  setSpots: (spots: DraftSpot[]) => void;
  spotName: string;
  spots: DraftSpot[];
}) {
  return (
    <section className="rounded-lg border border-line bg-white/[0.03] p-4">
      <h3 className="font-semibold text-white">Spots</h3>
      <div className="mt-3 grid gap-3 rounded-md border border-line bg-slate-950/45 p-3">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <input className="min-w-0 rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => setSpotName(event.target.value)} placeholder="Single spot name" value={spotName} />
          <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent" onClick={addSpot} type="button"><Plus size={15} /> Add</button>
        </div>
        <div className="grid gap-2 md:grid-cols-[1fr_120px_auto]">
          <input className="rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => setPrefix(event.target.value)} placeholder="Prefix, e.g. T" value={prefix} />
          <input className="rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" min={1} onChange={(event) => setPrefixCount(Number(event.target.value || 1))} type="number" value={prefixCount} />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" onClick={addPrefixedSpots} type="button">Create series</button>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {spots.map((spot, index) => (
          <div className="grid gap-2 rounded-md border border-line bg-slate-950/60 p-2 md:grid-cols-[1fr_auto]" key={`${spot.id ?? "new"}-${index}`}>
            <input className="rounded-md border border-line bg-slate-950/80 px-3 py-2 text-sm text-white" onChange={(event) => setSpots(spots.map((current, currentIndex) => currentIndex === index ? { ...current, name: event.target.value } : current))} value={spot.name} />
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-red-400/30 bg-red-500/10 text-red-100 disabled:opacity-40" disabled={spot.isOccupied} onClick={() => setSpots(spots.filter((_, currentIndex) => currentIndex !== index))} title={spot.isOccupied ? "Return item before deleting spot" : "Delete spot"} type="button"><Trash2 size={15} /></button>
          </div>
        ))}
        {spots.length === 0 ? <p className="text-sm text-slate-500">No named spots. Items can still be assigned directly to the card.</p> : null}
      </div>
    </section>
  );
}

function Field({ label, onChange, placeholder, required, value }: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <input className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} value={value} />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-line bg-white/[0.04] p-3">
      <div className="text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-slate-400">{label}</div>
    </div>
  );
}

function toDraftSpot(spot: UsedInSpot): DraftSpot {
  return { id: spot.id, isOccupied: spot.isOccupied, name: spot.name };
}
