import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DynamicInventoryTable } from "../components/inventory/DynamicInventoryTable";
import {
  getDynamicInventoryRequest,
  listDynamicInventoryRowsRequest,
} from "../services/inventory.service";
import { assignRowsToCardRequest, listUsedInCardsRequest } from "../services/used-in.service";
import type { DynamicInventory, DynamicInventoryRow } from "../types/inventory";
import type { UsedInCard } from "../types/used-in";

export function InventoryDetailsPage() {
  const { id } = useParams();
  const [inventory, setInventory] = useState<DynamicInventory | null>(null);
  const [rows, setRows] = useState<DynamicInventoryRow[]>([]);
  const [cards, setCards] = useState<UsedInCard[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getDynamicInventoryRequest(id),
      listDynamicInventoryRowsRequest(id),
      listUsedInCardsRequest(),
    ])
      .then(([inventoryResult, rowResult, cardResult]) => {
        setInventory(inventoryResult.inventory);
        setRows(rowResult.items);
        setCards(cardResult.cards);
        setError(null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : "Inventory unavailable");
      });
  }, [id]);

  async function assignSelectedRows() {
    if (!cardId || selected.size === 0) return;
    setError(null);
    setMessage(null);

    try {
      await assignRowsToCardRequest(cardId, { rowIds: Array.from(selected) });
      setSelected(new Set());
      setMessage("Rows assigned to Used In card.");
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : "Assignment failed");
    }
  }

  function toggleRow(rowId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to="/inventory">
          <ArrowLeft size={16} /> Inventory
        </Link>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Inventory table
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              {inventory?.name ?? "Inventory"}
            </h1>
          </div>
          <AssignmentBar
            cardId={cardId}
            cards={cards}
            disabled={selected.size === 0}
            onAssign={() => void assignSelectedRows()}
            onCardChange={setCardId}
            selectedCount={selected.size}
          />
        </div>
      </header>

      {error || message ? (
        <section className={`rounded-lg border p-4 text-sm ${error ? "border-red-400/30 bg-red-500/10 text-red-100" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"}`}>
          {error ?? message}
        </section>
      ) : null}

      {inventory ? (
        <DynamicInventoryTable
          columns={inventory.columns ?? []}
          onToggleRow={toggleRow}
          rows={rows}
          selectedRowIds={selected}
        />
      ) : null}
    </div>
  );
}

function AssignmentBar({
  cardId,
  cards,
  disabled,
  onAssign,
  onCardChange,
  selectedCount,
}: {
  cardId: string;
  cards: UsedInCard[];
  disabled: boolean;
  onAssign: () => void;
  onCardChange: (value: string) => void;
  selectedCount: number;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-line bg-white/5 p-3">
      <select
        className="rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white"
        onChange={(event) => onCardChange(event.target.value)}
        value={cardId}
      >
        <option value="">Select Used In card</option>
        {cards.map((card) => (
          <option key={card.id} value={card.id}>{card.name}</option>
        ))}
      </select>
      <button
        className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        disabled={disabled || !cardId}
        onClick={onAssign}
        type="button"
      >
        Assign {selectedCount || ""} row{selectedCount === 1 ? "" : "s"}
      </button>
    </div>
  );
}
