import { Camera, KeyRound, User } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  changePasswordRequest,
  getProfileRequest,
  updateProfileRequest,
  uploadProfilePictureRequest,
  type ProfileData,
} from "../services/profile.service";

export function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function loadProfile() {
    getProfileRequest()
      .then((result) => setProfile(result.profile))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load profile"));
  }

  useEffect(loadProfile, []);

  async function handleSaved() {
    loadProfile();
    await refreshUser();
    setSuccess("Profile updated.");
    setTimeout(() => setSuccess(null), 3000);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Account</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Profile settings</h1>
        <p className="mt-2 text-sm text-slate-400">Manage your personal information and password.</p>
      </header>

      {error ? <Notice kind="error">{error}</Notice> : null}
      {success ? <Notice kind="success">{success}</Notice> : null}

      {profile ? (
        <>
          <AvatarSection
            profile={profile}
            onUpdated={handleSaved}
            setError={setError}
          />
          <ProfileForm
            profile={profile}
            onSaved={handleSaved}
            setError={setError}
          />
          <PasswordForm
            onSaved={() => {
              setSuccess("Password changed.");
              setTimeout(() => setSuccess(null), 3000);
            }}
            setError={setError}
          />
        </>
      ) : null}
    </div>
  );
}

function AvatarSection({ onUpdated, profile, setError }: {
  onUpdated: () => Promise<void>;
  profile: ProfileData;
  setError: (msg: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const pictureUrl = profile.profile?.profilePictureUrl;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadProfilePictureRequest(file);
      await onUpdated();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Profile picture</h2>
      <div className="flex items-center gap-5">
        <div className="relative">
          {pictureUrl ? (
            <img alt="Profile" className="h-20 w-20 rounded-full object-cover border border-line" src={pictureUrl} />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-white/[0.06]">
              <User className="text-slate-400" size={32} />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent disabled:opacity-50"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            type="button"
          >
            <Camera size={15} /> {uploading ? "Uploading..." : "Change photo"}
          </button>
          <p className="text-xs text-slate-500">PNG, JPG, WEBP or GIF · max 3 MB</p>
        </div>
        <input accept="image/*" className="hidden" onChange={handleFileChange} ref={fileRef} type="file" />
      </div>
    </section>
  );
}

function ProfileForm({ onSaved, profile, setError }: {
  onSaved: () => Promise<void>;
  profile: ProfileData;
  setError: (msg: string | null) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [firstName, setFirstName] = useState(profile.profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile.profile?.lastName ?? "");
  const [phone, setPhone] = useState(profile.profile?.phoneNumber ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setFirstName(profile.profile?.firstName ?? "");
    setLastName(profile.profile?.lastName ?? "");
    setPhone(profile.profile?.phoneNumber ?? "");
  }, [profile]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProfileRequest({
        name: name.trim() || undefined,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        phoneNumber: phone.trim() || null,
      });
      await onSaved();
      setError(null);
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
        <div className="flex justify-end">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordForm({ onSaved, setError }: {
  onSaved: () => void;
  setError: (msg: string | null) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (next !== confirm) { setError("New passwords do not match."); return; }
    if (next.length < 8) { setError("Password must be at least 8 characters."); return; }
    setSaving(true);
    try {
      await changePasswordRequest({ currentPassword: current, newPassword: next });
      setCurrent(""); setNext(""); setConfirm("");
      setError(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <KeyRound className="text-accent" size={16} />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Change password</h2>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Current password" onChange={setCurrent} type="password" value={current} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="New password" onChange={setNext} type="password" value={next} />
          <Field label="Confirm new password" onChange={setConfirm} type="password" value={confirm} />
        </div>
        <div className="flex justify-end">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50" disabled={saving} type="submit">
            {saving ? "Changing..." : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({ disabled, label, onChange, placeholder, type = "text", value }: {
  disabled?: boolean;
  label: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <input
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function Notice({ children, kind }: { children: React.ReactNode; kind: "error" | "success" }) {
  const cls = kind === "error"
    ? "border-red-400/30 bg-red-500/10 text-red-100"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  return <section className={`rounded-lg border p-4 text-sm ${cls}`}>{children}</section>;
}
