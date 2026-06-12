import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { useResourceManagers } from "../hooks/useResourceManagers";
import { resourceManagerService, type ResourceManagerEntry } from "../services/resourceManagerService";
import { UserAvatar } from "./UserAvatar";

type User = { id: string; name: string; email: string; role: string };

async function fetchAllUsers(): Promise<User[]> {
  const res = await fetch("/api/admin/users", { credentials: "include" });
  if (!res.ok) return [];
  const body = await res.json();
  return (body as { data: { users: User[] } }).data.users ?? [];
}

type Props = {
  resourceType: "inventory_table" | "inventory_group" | "warehouse";
  resourceId: string;
  canEdit?: boolean;
  /** For inventory_table: also shows managers inherited from the parent group */
  groupId?: string | null;
};

export function InlineManagerStrip({ resourceType, resourceId, canEdit = true, groupId }: Props) {
  const { managers, assign, unassign } = useResourceManagers(resourceType, resourceId);
  const [groupManagers, setGroupManagers] = useState<ResourceManagerEntry[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    void fetchAllUsers().then(setAllUsers);
  }, [canEdit]);

  // Fetch group-level managers so table pages show inherited managers
  useEffect(() => {
    if (!groupId) { setGroupManagers([]); return; }
    resourceManagerService.list("inventory_group", groupId)
      .then(setGroupManagers)
      .catch(() => setGroupManagers([]));
  }, [groupId]);

  const directIds = new Set(managers.map((m) => m.userId));
  // Group managers not already assigned directly
  const inheritedManagers = groupManagers.filter((m) => !directIds.has(m.userId));

  const assignedAndInheritedIds = new Set([...directIds, ...inheritedManagers.map((m) => m.userId)]);
  const available = allUsers.filter((u) => !assignedAndInheritedIds.has(u.id));

  const hasAny = managers.length > 0 || inheritedManagers.length > 0;

  async function handleAssign() {
    if (!selectedUserId) return;
    setAssigning(true);
    setError(null);
    try {
      await assign(selectedUserId);
      setSelectedUserId("");
      setPickerOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(assignmentId: string) {
    setError(null);
    try { await unassign(assignmentId); } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Managers</span>

      {!hasAny && (
        <span className="text-xs text-slate-600">—</span>
      )}

      {/* Inherited from group */}
      {inheritedManagers.map((m) => (
        <span
          key={m.id}
          className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 py-1 pl-1 pr-3 text-sm text-slate-300"
          title={`${m.user.name} — inherited from group`}
        >
          <UserAvatar name={m.user.name} pictureUrl={m.user.profile?.profilePictureUrl} size={32} />
          {m.user.name}
          <span className="text-slate-500 text-xs">· group</span>
        </span>
      ))}

      {/* Directly assigned */}
      {managers.map((m) => (
        <span
          key={m.id}
          className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 py-1 pl-1 pr-3 text-sm font-medium text-accent"
        >
          <UserAvatar name={m.user.name} pictureUrl={m.user.profile?.profilePictureUrl} size={32} />
          {m.user.name}
          {canEdit && (
            <button
              aria-label={`Remove ${m.user.name}`}
              className="ml-0.5 rounded-full p-0.5 hover:bg-red-500/20 hover:text-red-400"
              onClick={() => void handleUnassign(m.id)}
            >
              <X size={10} />
            </button>
          )}
        </span>
      ))}

      {/* Assign picker */}
      {canEdit && !pickerOpen && (
        <button
          className="flex items-center gap-1 rounded-full border border-dashed border-slate-600 px-2.5 py-0.5 text-xs text-slate-500 hover:border-accent hover:text-accent"
          onClick={() => setPickerOpen(true)}
        >
          <UserPlus size={10} /> Assign
        </button>
      )}

      {canEdit && pickerOpen && (
        <div className="flex items-center gap-1.5">
          <select
            autoFocus
            className="rounded-md border border-line bg-slate-950 px-2 py-1 text-xs text-white"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Pick user…</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <button
            className="rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-slate-950 disabled:opacity-50"
            disabled={!selectedUserId || assigning}
            onClick={() => void handleAssign()}
          >
            {assigning ? "…" : "Add"}
          </button>
          <button
            className="rounded-md border border-line px-2 py-1 text-xs text-slate-400 hover:text-white"
            onClick={() => { setPickerOpen(false); setSelectedUserId(""); }}
          >
            Cancel
          </button>
        </div>
      )}

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
