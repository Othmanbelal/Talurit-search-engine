import { Power, PowerOff, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { resourceManagerService } from "../../services/resourceManagerService";
import { buildApiUrl } from "../../services/http";
import { formatDateTime } from "../../utils/format";
import { formatRole, userRoleOptions } from "../../constants/roles";
import type { AdminUser, UpdateUserPayload } from "../../types/admin";
import type { UserRole } from "../../types/auth";

type UsersTableProps = {
  currentUserId?: string;
  isLoading: boolean;
  onUpdate: (id: string, payload: UpdateUserPayload) => void;
  users: AdminUser[];
};

export function UsersTable({ currentUserId, isLoading, onUpdate, users }: UsersTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-semibold text-white">Users</h2>
        <p className="mt-1 text-sm text-slate-400">Manage access, roles, and account state.</p>
      </div>
      {/* Mobile: card list */}
      <div className="space-y-2 p-4 md:hidden">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />
        ) : null}
        {!isLoading && users.length === 0 ? (
          <p className="text-sm text-slate-400">No users found.</p>
        ) : null}
        {!isLoading
          ? users.map((user) => {
              const profile = user.profile;
              const fullName = profile
                ? `${profile.firstName} ${profile.lastName}`
                : user.name;
              return (
                <div className="rounded-lg border border-line bg-white/[0.03] p-4" key={user.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{fullName}</p>
                      <p className="mt-0.5 text-sm text-slate-400">{user.email}</p>
                    </div>
                    <StatusPill active={user.isActive} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <RoleSelect
                      disabled={user.id === currentUserId}
                      onChange={(role) => onUpdate(user.id, { role })}
                      value={user.role}
                    />
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={user.id === currentUserId}
                      onClick={() => onUpdate(user.id, { isActive: !user.isActive })}
                      title={user.isActive ? "Deactivate" : "Reactivate"}
                      type="button"
                    >
                      {user.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                  </div>
                </div>
              );
            })
          : null}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Profile</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Manages</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? <LoadingRows /> : null}
            {!isLoading && users.length === 0 ? <EmptyRow /> : null}
            {!isLoading
              ? users.map((user) => (
                  <tr className="text-slate-200 hover:bg-white/[0.03]" key={user.id}>
                    <td className="px-4 py-3">
                      <ProfileCell user={user} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3 text-slate-300">{user.profile?.phoneNumber ?? "-"}</td>
                    <td className="px-4 py-3">
                      <RoleSelect
                        disabled={user.id === currentUserId}
                        onChange={(role) => onUpdate(user.id, { role })}
                        value={user.role}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <ManagedResourcesCell userId={user.id} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill active={user.isActive} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{formatDateTime(user.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={user.id === currentUserId}
                        onClick={() => onUpdate(user.id, { isActive: !user.isActive })}
                        title={user.isActive ? "Deactivate" : "Reactivate"}
                        type="button"
                      >
                        {user.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                      </button>
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RoleSelect({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange: (role: UserRole) => void;
  value: UserRole;
}) {
  return (
    <select
      className="rounded-md border border-line bg-slate-950/70 px-2 py-1.5 text-sm text-white outline-none focus:border-accent disabled:opacity-50"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as UserRole)}
      title={formatRole(value)}
      value={value}
    >
      {userRoleOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "rounded-md border px-2 py-1 text-xs",
        active
          ? "border-green-400/30 bg-green-500/10 text-green-200"
          : "border-red-400/30 bg-red-500/10 text-red-200",
      ].join(" ")}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function LoadingRows() {
  return (
    <tr>
      <td className="px-4 py-6" colSpan={8}>
        <div className="h-5 animate-pulse rounded bg-white/10" />
      </td>
    </tr>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td className="px-4 py-8 text-center text-slate-400" colSpan={8}>
        No users found.
      </td>
    </tr>
  );
}

function ManagedResourcesCell({ userId }: { userId: string }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    resourceManagerService.listByUser(userId)
      .then((data) => setCount(data.length))
      .catch(() => setCount(0));
  }, [userId]);
  if (count === null) return <span className="text-slate-500 text-xs">…</span>;
  if (count === 0) return <span className="text-slate-500 text-xs">—</span>;
  return (
    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
      {count} resource{count !== 1 ? "s" : ""}
    </span>
  );
}

function ProfileCell({ user }: { user: AdminUser }) {
  const profile = user.profile;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : user.name;

  return (
    <div className="flex min-w-48 items-center gap-3">
      {profile?.profilePictureUrl ? (
        <img
          alt=""
          className="h-10 w-10 rounded-md border border-line object-cover"
          src={buildApiUrl(profile.profilePictureUrl)}
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-slate-400">
          <UserCircle size={20} />
        </div>
      )}
      <div>
        <div className="font-medium text-white">{fullName}</div>
        <div className="text-xs text-slate-500">Profile</div>
      </div>
    </div>
  );
}
