import { Boxes, Check, Compass, RotateCcw, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LANDING_PAGE_OPTIONS } from "../../constants/landing";
import { listStructuredInventoriesRequest } from "../../services/structured-inventory.service";
import { updateProfileRequest, type ProfileData, type ProfileUpdateInput } from "../../services/profile.service";

type Choice = { id: string; name: string };

export function LandingPagePicker({ onSaved, onError, profile }: {
  onSaved: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
  profile: ProfileData;
}) {
  const [groups, setGroups] = useState<Choice[]>([]);
  const [tables, setTables] = useState<Choice[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listStructuredInventoriesRequest()
      .then((result) => {
        const overview = result.inventories;
        setGroups(overview.groups.map((group) => ({ id: group.id, name: group.name })));
        const groupedTables = overview.groups.flatMap((group) =>
          group.tables.map((table) => ({ id: table.id, name: table.name })),
        );
        const ungrouped = overview.ungroupedTables.map((table) => ({ id: table.id, name: table.name }));
        setTables([...groupedTables, ...ungrouped]);
      })
      .catch(() => { setGroups([]); setTables([]); });
  }, []);

  const pref = profile.profile;
  const activeKey = useMemo(() => {
    if (pref?.landingType === "page") return `page:${pref.landingPath}`;
    if (pref?.landingType === "group") return `group:${pref.landingTargetId}`;
    if (pref?.landingType === "table") return `table:${pref.landingTargetId}`;
    return null;
  }, [pref]);

  async function save(input: ProfileUpdateInput, message: string) {
    setSaving(true);
    try {
      await updateProfileRequest(input);
      await onSaved(message);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save landing page");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-1 flex items-center gap-2">
        <Compass className="text-accent" size={16} />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Landing page</h2>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Choose where the app opens after you sign in.
        {activeKey ? "" : " Currently defaulting to the Dashboard."}
      </p>

      <Group title="App pages" icon={<Compass size={13} />}>
        {LANDING_PAGE_OPTIONS.map((option) => (
          <Chip
            key={option.path}
            active={activeKey === `page:${option.path}`}
            disabled={saving}
            label={option.label}
            onClick={() => save({ landingType: "page", landingPath: option.path, landingTargetId: null }, `Landing page set to ${option.label}.`)}
          />
        ))}
      </Group>

      {groups.length > 0 ? (
        <Group title="Inventory groups" icon={<Boxes size={13} />}>
          {groups.map((group) => (
            <Chip
              key={group.id}
              active={activeKey === `group:${group.id}`}
              disabled={saving}
              label={group.name}
              onClick={() => save({ landingType: "group", landingTargetId: group.id, landingPath: null }, `Landing page set to ${group.name}.`)}
            />
          ))}
        </Group>
      ) : null}

      {tables.length > 0 ? (
        <Group title="Inventory tables" icon={<Table2 size={13} />}>
          {tables.map((table) => (
            <Chip
              key={table.id}
              active={activeKey === `table:${table.id}`}
              disabled={saving}
              label={table.name}
              onClick={() => save({ landingType: "table", landingTargetId: table.id, landingPath: null }, `Landing page set to ${table.name}.`)}
            />
          ))}
        </Group>
      ) : null}

      {activeKey ? (
        <button
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-accent hover:text-accent disabled:opacity-50"
          disabled={saving}
          onClick={() => save({ landingType: null }, "Landing page reset to Dashboard.")}
          type="button"
        >
          <RotateCcw size={13} /> Reset to Dashboard
        </button>
      ) : null}
    </section>
  );
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{icon} {title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ active, disabled, label, onClick }: { active: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
        active ? "border-accent bg-accent/15 text-accent" : "border-line bg-white/[0.03] text-slate-300 hover:border-accent/50"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {active ? <Check size={13} /> : null} {label}
    </button>
  );
}
