import { FormEvent, useEffect, useState } from "react";
import { updateProfileRequest, type ProfileData } from "../../services/profile.service";
import { Field } from "./Field";

export function ProfileForm({ onSaved, profile }: {
  onSaved: (message: string) => Promise<void> | void;
  profile: ProfileData;
}) {
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
      await onSaved("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Personal information</h2>
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="First name" onChange={setFirstName} value={firstName} />
          <Field label="Last name" onChange={setLastName} value={lastName} />
        </div>
        <Field label="Display name" onChange={setName} value={name} />
        <Field label="Email" value={profile.email} disabled />
        <Field label="Phone number" onChange={setPhone} placeholder="+46 70 000 00 00" value={phone} />
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <div className="flex justify-end">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
