import { RotateCcw, XCircle } from "lucide-react";
import { formatRole } from "../../constants/roles";
import { formatDateTime } from "../../utils/format";
import type { UserInvitation } from "../../types/admin";

type InvitationsPanelProps = {
  invitations: UserInvitation[];
  isLoading: boolean;
  onCancel: (id: string) => void;
  onResend: (id: string) => void;
};

export function InvitationsPanel({
  invitations,
  isLoading,
  onCancel,
  onResend,
}: InvitationsPanelProps) {
  const pending = invitations.filter((invitation) => invitation.status === "pending");
  const expired = invitations.filter((invitation) => invitation.status === "expired");

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <InvitationList
        emptyText="No pending invitations."
        invitations={pending}
        isLoading={isLoading}
        onCancel={onCancel}
        onResend={onResend}
        title="Pending invitations"
      />
      <InvitationList
        emptyText="No expired invitations."
        invitations={expired}
        isLoading={isLoading}
        onCancel={onCancel}
        onResend={onResend}
        title="Expired invitations"
      />
    </section>
  );
}

function InvitationList({
  emptyText,
  invitations,
  isLoading,
  onCancel,
  onResend,
  title,
}: InvitationsPanelProps & { emptyText: string; title: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-5 shadow-industrial">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4 space-y-3">
        {isLoading ? <div className="h-16 animate-pulse rounded-md bg-white/10" /> : null}
        {!isLoading && invitations.length === 0 ? (
          <p className="rounded-md border border-line bg-white/5 px-3 py-4 text-sm text-slate-400">
            {emptyText}
          </p>
        ) : null}
        {!isLoading
          ? invitations.map((invitation) => (
              <article
                className="rounded-md border border-line bg-white/[0.04] p-4"
                key={invitation.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{invitation.email}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {invitation.name ?? "No name"} / {formatRole(invitation.role)}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Expires {formatDateTime(invitation.expiresAt)}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <IconButton label="Resend" onClick={() => onResend(invitation.id)} icon={RotateCcw} />
                    {invitation.status === "pending" ? (
                      <IconButton label="Cancel" onClick={() => onCancel(invitation.id)} icon={XCircle} />
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          : null}
      </div>
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-accent"
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon size={15} />
    </button>
  );
}
