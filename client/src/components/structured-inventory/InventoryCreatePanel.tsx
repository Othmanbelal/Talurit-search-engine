import { FormEvent, useState } from "react";
import { FolderPlus, Plus, Table2, X } from "lucide-react";
import type { CreateInventoryGroupInput, CreateInventoryTableInput } from "../../types/structured-inventory";

type Mode = "group" | "table" | null;

export function InventoryCreatePanel({
  onCreateGroup,
  onCreateTable,
}: {
  onCreateGroup: (input: CreateInventoryGroupInput) => Promise<void>;
  onCreateTable: (input: CreateInventoryTableInput) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [groupName, setGroupName] = useState("");
  const [tableName, setTableName] = useState("");

  function activate(next: Mode) {
    setMode(next);
    setGroupName("");
    setTableName("");
  }

  async function submitGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupName.trim()) return;
    await onCreateGroup({ name: groupName.trim() });
    activate(null);
  }

  async function submitTable(event: FormEvent) {
    event.preventDefault();
    if (!tableName.trim()) return;
    await onCreateTable({ name: tableName.trim(), tableType: "manual_inventory" });
    activate(null);
  }

  return (
    <div className="space-y-2">
      {/* Option buttons */}
      <div className="flex flex-wrap gap-2">
        <OptionButton
          active={mode === "group"}
          icon={<FolderPlus size={15} />}
          label="New group"
          onClick={() => activate(mode === "group" ? null : "group")}
        />
        <OptionButton
          active={mode === "table"}
          icon={<Table2 size={15} />}
          label="New standalone table"
          onClick={() => activate(mode === "table" ? null : "table")}
        />
      </div>

      {/* Inline form */}
      {mode === "group" && (
        <InlineForm
          onCancel={() => activate(null)}
          onSubmit={submitGroup}
          onChange={setGroupName}
          placeholder="Group name…"
          submitLabel="Create group"
          value={groupName}
        />
      )}
      {mode === "table" && (
        <InlineForm
          onCancel={() => activate(null)}
          onSubmit={submitTable}
          onChange={setTableName}
          placeholder="Table name…"
          submitLabel="Create table"
          value={tableName}
        />
      )}
    </div>
  );
}

function OptionButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-line text-slate-400 hover:border-slate-500 hover:text-slate-200"
      }`}
      onClick={onClick}
      type="button"
    >
      <Plus size={13} className={active ? "text-accent" : ""} />
      {icon}
      {label}
    </button>
  );
}

function InlineForm({
  onCancel,
  onChange,
  onSubmit,
  placeholder,
  submitLabel,
  value,
}: {
  onCancel: () => void;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  placeholder: string;
  submitLabel: string;
  value: string;
}) {
  return (
    <form
      className="flex items-center gap-2 rounded-md border border-accent/25 bg-accent/5 px-3 py-2"
      onSubmit={onSubmit}
    >
      <input
        autoFocus
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder-slate-500"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <button
        className="shrink-0 rounded px-3 py-1.5 text-xs font-semibold bg-accent text-slate-950 disabled:opacity-40"
        disabled={!value.trim()}
        type="submit"
      >
        {submitLabel}
      </button>
      <button
        className="shrink-0 rounded p-1 text-slate-500 hover:text-white"
        onClick={onCancel}
        type="button"
      >
        <X size={14} />
      </button>
    </form>
  );
}
