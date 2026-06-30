import { RotateCcw, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("admin");
  const pending = invitations.filter((invitation) => invitation.status === "pending");
  const expired = invitations.filter((invitation) => invitation.status === "expired");

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <InvitationList
        emptyText={t("users.invitations.emptyPending")}
        invitations={pending}
        isLoading={isLoading}
        onCancel={onCancel}
        onResend={onResend}
        title={t("users.invitations.titlePending")}
      />
      <InvitationList
        emptyText={t("users.invitations.emptyExpired")}
        invitations={expired}
        isLoading={isLoading}
        onCancel={onCancel}
        onResend={onResend}
        title={t("users.invitations.titleExpired")}
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
              <InvitationCard
                invitation={invitation}
                key={invitation.id}
                onCancel={onCancel}
                onResend={onResend}
              />
            ))
          : null}
      </div>
    </div>
  );
}

function InvitationCard({
  invitation,
  onCancel,
  onResend,
}: {
  invitation: UserInvitation;
  onCancel: (id: string) => void;
  onResend: (id: string) => void;
}) {
  const { t } = useTranslation("admin");

  return (
    <article className="rounded-md border border-line bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-white">{invitation.email}</div>
          <div className="mt-1 text-sm text-slate-400">
            {invitation.name ?? t("users.invitations.noName")} / {formatRole(invitation.role)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {t("users.invitations.expires", { date: formatDateTime(invitation.expiresAt) })}
          </div>
        </div>
        <div className="flex gap-1.5">
          <IconButton label={t("users.invitations.resend")} onClick={() => onResend(invitation.id)} icon={RotateCcw} />
          {invitation.status === "pending" ? (
            <IconButton label={t("users.invitations.cancel")} onClick={() => onCancel(invitation.id)} icon={XCircle} />
          ) : null}
        </div>
      </div>
    </article>
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
