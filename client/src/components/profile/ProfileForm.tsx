import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { updateProfileRequest, type ProfileData } from "../../services/profile.service";
import { Field } from "./Field";

export function ProfileForm({ onSaved, profile }: {
  onSaved: (message: string) => Promise<void> | void;
  profile: ProfileData;
}) {
  const { t } = useTranslation("profile");
  const [name, setName] = useState(profile.name);
  const [firstName, setFirstName] = useState(profile.profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile.profile?.lastName ?? "");
  const [phone, setPhone] = useState(profile.profile?.phoneNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(profile.name);
    setFirstName(profile.profile?.firstName ?? "");
    setLastName(profile.profile?.lastName ?? "");
    setPhone(profile.profile?.phoneNumber ?? "");
  }, [profile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateProfileRequest({
        name: name.trim() || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phoneNumber: phone.trim() || null,
      });
      await onSaved(t("form.saved"));
    } catch {
      setError(t("form.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{t("form.title")}</h2>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("form.firstName")} onChange={setFirstName} value={firstName} />
          <Field label={t("form.lastName")} onChange={setLastName} value={lastName} />
        </div>
        <Field label={t("form.displayName")} onChange={setName} value={name} />
        <Field label={t("form.email")} value={profile.email} disabled />
        <Field label={t("form.phone")} onChange={setPhone} placeholder={t("form.phonePlaceholder")} value={phone} />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <div className="flex justify-end">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} type="submit">
            {saving ? t("form.saving") : t("form.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
