import { useEffect, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { useResourceManagers } from "../hooks/useResourceManagers";
import { UserAvatar } from "./UserAvatar";

type User = { id: string; name: string; email: string; role: string; profile?: { profilePictureUrl?: string | null } | null };

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
};

export function ResourceManagerPicker({ resourceType, resourceId, canEdit = true }: Props) {
  const { managers, loading, error, assign, unassign } = useResourceManagers(resourceType, resourceId);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => { void fetchAllUsers().then(setAllUsers); }, []);

  const assignedIds = new Set(managers.map((m) => m.userId));
  const available = allUsers.filter((u) => !assignedIds.has(u.id));

  async function handleAssign() {
    if (!selectedUserId) return;
    setAssigning(true);
    setActionError(null);
    try {
      await assign(selectedUserId);
      setSelectedUserId("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to assign manager");
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassign(assignmentId: string) {
    setActionError(null);
    try {
      await unassign(assignmentId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove manager");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Assigned managers</p>

      {loading && <p className="text-xs text-slate-500">Loading…</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {actionError && <p className="text-xs text-red-400">{actionError}</p>}

      {managers.length === 0 && !loading && (
        <p className="text-xs text-slate-500">No managers assigned yet.</p>
      )}

      <ul className="space-y-1.5">
        {managers.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 rounded-md border border-line bg-slate-900/60 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <UserAvatar name={m.user.name} pictureUrl={m.user.profile?.profilePictureUrl} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{m.user.name}</p>
                <p className="truncate text-xs text-slate-400">{m.user.email}</p>
              </div>
            </div>
            {canEdit && (
              <button
                aria-label={`Remove ${m.user.name}`}
                className="shrink-0 rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => void handleUnassign(m.id)}
              >
                <X size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="flex gap-2">
          <select
            className="flex-1 rounded-md border border-line bg-slate-950/80 px-3 py-2 text-sm text-white"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Select user to add…</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
          <button
            className="flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-2 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
            disabled={!selectedUserId || assigning}
            onClick={() => void handleAssign()}
          >
            {assigning ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
            Add
          </button>
        </div>
      )}
    </div>
  );
}
