import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPasswordRequest } from "../services/auth.service";

export function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!token) return setError(t("resetPassword.error.tokenMissing"));
    if (password !== confirmPassword) return setError(t("resetPassword.error.passwordMismatch"));
    setIsSubmitting(true);
    try {
      const result = await resetPasswordRequest(token, password);
      setMessage(result.message);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("resetPassword.error.resetFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-7 shadow-industrial">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
            <ShieldCheck aria-hidden="true" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{t("resetPassword.title")}</h1>
            <p className="text-sm text-slate-400">{t("resetPassword.subtitle")}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <PasswordField label={t("resetPassword.newPassword")} onChange={setPassword} value={password} />
          <PasswordField label={t("resetPassword.confirmPassword")} onChange={setConfirmPassword} value={confirmPassword} />
          {message ? <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !token || Boolean(message)}
            type="submit"
          >
            {isSubmitting ? t("resetPassword.submitting") : t("resetPassword.submit")}
          </button>
        </form>

        <Link className="mt-5 block text-center text-sm text-slate-300 hover:text-white" to="/login">
          {t("resetPassword.backToSignIn")}
        </Link>
      </section>
    </main>
  );
}

function PasswordField(props: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{props.label}</span>
      <input
        autoComplete="new-password"
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
        minLength={12}
        onChange={(event) => props.onChange(event.target.value)}
        required
        type="password"
        value={props.value}
      />
    </label>
  );
}
