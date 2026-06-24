import { FormEvent, useRef, useState } from "react";
import { Camera, KeyRound, User } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { acceptInviteRequest } from "../services/auth.service";
import { uploadProfilePictureRequest } from "../services/profile.service";
import { AvatarCropModal } from "../components/profile/AvatarCropModal";

const MAX_BYTES = 3 * 1024 * 1024;

export function AcceptInvitePage() {
  const { refreshUser, user } = useAuth();
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (user) {
    return <Navigate replace to="/dashboard" />;
  }

  function openFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError(t("acceptInvite.error.invalidImage")); return; }
    if (file.size > MAX_BYTES) { setError(t("acceptInvite.error.imageTooLarge")); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  function handleCropped(blob: Blob) {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoBlob(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) { setError(t("acceptInvite.error.tokenMissing")); return; }
    if (password !== confirmPassword) { setError(t("acceptInvite.error.passwordMismatch")); return; }

    setIsSubmitting(true);
    try {
      // Accepting the invite creates the account AND logs the user in (sets the session).
      await acceptInviteRequest({ token, firstName, lastName, phoneNumber: phoneNumber || undefined, password });
      // Now authenticated: upload the chosen photo via the same endpoint as Profile settings.
      if (photoBlob) {
        try {
          await uploadProfilePictureRequest(new File([photoBlob], "avatar.jpg", { type: "image/jpeg" }));
        } catch {
          // Non-blocking: account is created; they can add a photo later in Profile settings.
        }
      }
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : t("acceptInvite.error.invitationFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-7 shadow-industrial">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
            <KeyRound aria-hidden="true" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{t("acceptInvite.title")}</h1>
            <p className="text-sm text-slate-400">{t("acceptInvite.subtitle")}</p>
          </div>
        </div>

        {!token ? (
          <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
            {t("acceptInvite.error.tokenMissing")}
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <AvatarChooser
              addPhotoLabel={t("acceptInvite.addPhoto")}
              changePhotoLabel={t("acceptInvite.changePhoto")}
              onPick={() => fileRef.current?.click()}
              photoHint={t("acceptInvite.photoHint")}
              preview={photoPreview}
            />
            <input accept="image/*" className="hidden" onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }} ref={fileRef} type="file" />

            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label={t("acceptInvite.firstName")} onChange={setFirstName} required value={firstName} />
              <TextInput label={t("acceptInvite.lastName")} onChange={setLastName} required value={lastName} />
            </div>
            <TextInput label={t("acceptInvite.phoneNumber")} onChange={setPhoneNumber} value={phoneNumber} />
            <PasswordInput label={t("acceptInvite.password")} onChange={setPassword} value={password} />
            <PasswordInput label={t("acceptInvite.confirmPassword")} onChange={setConfirmPassword} value={confirmPassword} />

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <button
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t("acceptInvite.submitting") : t("acceptInvite.submit")}
            </button>
          </form>
        )}
      </section>

      {cropSrc ? <AvatarCropModal imageSrc={cropSrc} onCancel={() => setCropSrc(null)} onCropped={handleCropped} /> : null}
    </main>
  );
}

function AvatarChooser({ addPhotoLabel, changePhotoLabel, onPick, photoHint, preview }: {
  addPhotoLabel: string;
  changePhotoLabel: string;
  onPick: () => void;
  photoHint: string;
  preview: string | null;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {preview ? (
          <img alt="Profile" className="h-16 w-16 rounded-full border border-line object-cover" src={preview} />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-white/[0.06]">
            <User className="text-slate-400" size={26} />
          </div>
        )}
      </div>
      <div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent"
          onClick={onPick}
          type="button"
        >
          <Camera size={15} /> {preview ? changePhotoLabel : addPhotoLabel}
        </button>
        <p className="mt-1 text-xs text-slate-500">{photoHint}</p>
      </div>
    </div>
  );
}

function TextInput({ label, onChange, required, type = "text", value }: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function PasswordInput({ label, onChange, value }: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
        minLength={8}
        onChange={(event) => onChange(event.target.value)}
        required
        type="password"
        value={value}
      />
    </label>
  );
}
