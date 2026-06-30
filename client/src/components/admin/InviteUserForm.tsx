import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { userRoleOptions } from "../../constants/roles";
import type { InviteUserPayload } from "../../types/admin";
import type { UserRole } from "../../types/auth";

type InviteUserFormProps = {
  disabled?: boolean;
  onSubmit: (payload: InviteUserPayload) => Promise<unknown>;
};

export function InviteUserForm({ disabled, onSubmit }: InviteUserFormProps) {
  const { t } = useTranslation("admin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("employee");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      await onSubmit({ email, name: name || undefined, role });
      setEmail("");
      setName("");
      setRole("employee");
      setMessage(t("invite.success"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("invite.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-industrial">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{t("invite.title")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("invite.description")}</p>
      </div>

      <form className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto]" onSubmit={handleSubmit}>
        <input
          className="rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("invite.emailPlaceholder")}
          required
          type="email"
          value={email}
        />
        <input
          className="rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
          onChange={(event) => setName(event.target.value)}
          placeholder={t("invite.namePlaceholder")}
          type="text"
          value={name}
        />
        <select
          className="rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
          onChange={(event) => setRole(event.target.value as UserRole)}
          value={role}
        >
          {userRoleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || isSubmitting}
          type="submit"
        >
          <Send size={16} /> {isSubmitting ? t("invite.submitting") : t("invite.submit")}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-green-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
