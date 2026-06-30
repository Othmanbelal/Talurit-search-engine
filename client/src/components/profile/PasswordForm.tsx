import { Check, Eye, EyeOff, KeyRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { changePasswordRequest } from "../../services/profile.service";
import { evaluatePassword } from "../../utils/passwordStrength";
import { Field } from "./Field";

const STRENGTH_COLORS = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-lime-400", "bg-emerald-400"];

export function PasswordForm({ onSaved, onError }: {
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation("profile");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);

  const strength = evaluatePassword(next);
  const allMet = strength.requirements.every((requirement) => requirement.met);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next !== confirm) { onError(t("password.error.mismatch")); return; }
    if (!allMet) { onError(t("password.error.requirements")); return; }
    setSaving(true);
    try {
      await changePasswordRequest({ currentPassword: current, newPassword: next });
      setCurrent(""); setNext(""); setConfirm("");
      onSaved(t("password.saved"));
    } catch (err) {
      // The backend's "incorrect current password" message has no error code yet,
      // so match its known text to show a translated message instead of raw English.
      const isIncorrect = err instanceof Error && err.message === "Current password is incorrect.";
      onError(isIncorrect ? t("password.error.incorrect") : t("password.error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="text-accent" size={16} />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{t("password.title")}</h2>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <Field
          label={t("password.current")}
          onChange={setCurrent}
          type={showCurrent ? "text" : "password"}
          value={current}
          right={<RevealButton shown={showCurrent} onToggle={() => setShowCurrent((v) => !v)} />}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={t("password.new")}
            onChange={setNext}
            type={showNext ? "text" : "password"}
            value={next}
            right={<RevealButton shown={showNext} onToggle={() => setShowNext((v) => !v)} />}
          />
          <Field label={t("password.confirm")} onChange={setConfirm} type={showNext ? "text" : "password"} value={confirm} />
        </div>

        {next ? <StrengthMeter score={strength.score} scoreKey={strength.scoreKey} /> : null}
        {next ? (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {strength.requirements.map((requirement) => (
              <li key={requirement.key} className={`flex items-center gap-1.5 text-xs ${requirement.met ? "text-emerald-300" : "text-slate-500"}`}>
                {requirement.met ? <Check size={13} /> : <X size={13} />} {t(`password.requirement.${requirement.key}`)}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex justify-end">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} type="submit">
            {saving ? t("password.submitting") : t("password.submit")}
          </button>
        </div>
      </form>
    </section>
  );
}

function StrengthMeter({ score, scoreKey }: { score: number; scoreKey: string }) {
  const { t } = useTranslation("profile");
  return (
    <div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((index) => (
          <span key={index} className={`h-1.5 flex-1 rounded-full ${index <= score ? STRENGTH_COLORS[score] : "bg-white/10"}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-400">{t("password.strength")} <span className="font-semibold text-slate-200">{t(`password.strengthLabel.${scoreKey}`)}</span></p>
    </div>
  );
}

function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  const { t } = useTranslation("profile");
  return (
    <button className="rounded p-1 text-slate-400 hover:text-accent" onClick={onToggle} type="button" aria-label={shown ? t("password.hidePassword") : t("password.showPassword")}>
      {shown ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );
}
