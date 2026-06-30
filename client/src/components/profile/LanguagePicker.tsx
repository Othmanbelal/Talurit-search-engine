import { Check, Languages } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";
import { updateProfileRequest, type ProfileData } from "../../services/profile.service";

type Language = "sv" | "en";

export function LanguagePicker({ profile, onSaved, onError }: {
  profile: ProfileData;
  onSaved: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation("profile");
  const [saving, setSaving] = useState(false);
  const current = (profile.profile?.language ?? i18n.language ?? "sv") as Language;

  async function handleSelect(lang: Language) {
    if (lang === current || saving) return;
    setSaving(true);
    try {
      await updateProfileRequest({ language: lang });
      await i18n.changeLanguage(lang);
      const message = lang === "sv" ? t("language.savedSv") : t("language.savedEn");
      await onSaved(message);
    } catch {
      onError(t("language.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-1 flex items-center gap-2">
        <Languages className="text-accent" size={16} />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          {t("language.title")}
        </h2>
      </div>
      <p className="mb-4 text-xs text-slate-500">{t("language.description")}</p>

      <div className="flex flex-wrap gap-2">
        {(["sv", "en"] as Language[]).map((lang) => (
          <button
            key={lang}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              current === lang
                ? "border-accent bg-accent/15 text-accent"
                : "border-line bg-white/[0.03] text-slate-300 hover:border-accent/50"
            }`}
            disabled={saving}
            onClick={() => void handleSelect(lang)}
            type="button"
          >
            {current === lang ? <Check size={13} /> : null}
            {t(`language.${lang}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
