import { useState } from "react";
import { AlertTriangle, Users } from "lucide-react";
import { InvitationsPanel } from "../components/admin/InvitationsPanel";
import { InviteUserForm } from "../components/admin/InviteUserForm";
import { UsersTable } from "../components/admin/UsersTable";
import { useAdminSettings } from "../hooks/useAdminSettings";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { useAuth } from "../hooks/useAuth";

export function AdminUsersPage() {
  const { user } = useAuth();
  const adminUsers = useAdminUsers();
  const adminSettings = useAdminSettings();
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeUsers, inactiveUsers] = splitUsers(adminUsers.data?.users ?? []);

  async function runAction(action: () => Promise<unknown>) {
    setActionError(null);

    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Admin action failed");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Administration
        </p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold text-white md:text-4xl">
          <Users aria-hidden="true" size={32} /> Users
        </h1>
      </header>

      {adminSettings.settings?.email.warning ? (
        <section className="flex gap-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="shrink-0" size={18} />
          {adminSettings.settings.email.warning}
        </section>
      ) : null}

      {actionError || adminUsers.error ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {actionError ?? adminUsers.error}
        </section>
      ) : null}

      <InviteUserForm onSubmit={adminUsers.inviteUser} />

      <UsersTable
        currentUserId={user?.id}
        isLoading={adminUsers.isLoading}
        onUpdate={(id, payload) => void runAction(() => adminUsers.updateUser(id, payload))}
        users={[...activeUsers, ...inactiveUsers]}
      />

      <InvitationsPanel
        invitations={adminUsers.data?.invitations ?? []}
        isLoading={adminUsers.isLoading}
        onCancel={(id) => void runAction(() => adminUsers.cancelInvitation(id))}
        onResend={(id) => void runAction(() => adminUsers.resendInvitation(id))}
      />
    </div>
  );
}

function splitUsers<T extends { isActive: boolean }>(users: T[]) {
  return [users.filter((user) => user.isActive), users.filter((user) => !user.isActive)];
}
