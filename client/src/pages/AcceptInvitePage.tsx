import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { acceptInviteRequest } from "../services/auth.service";

export function AcceptInvitePage() {
  const { refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate replace to="/dashboard" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Invitation token is missing.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await acceptInviteRequest({
        token,
        firstName,
        lastName,
        phoneNumber: phoneNumber || undefined,
        profilePictureUrl: profilePictureUrl || undefined,
        password,
      });
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Invitation failed");
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
            <h1 className="text-xl font-semibold text-white">Accept invitation</h1>
            <p className="text-sm text-slate-400">Set your password to continue.</p>
          </div>
        </div>

        {!token ? (
          <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
            Invitation token is missing.
          </p>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="First name" onChange={setFirstName} required value={firstName} />
              <TextInput label="Last name" onChange={setLastName} required value={lastName} />
            </div>

            <TextInput label="Phone number" onChange={setPhoneNumber} value={phoneNumber} />
            <TextInput
              label="Profile picture URL"
              onChange={setProfilePictureUrl}
              type="url"
              value={profilePictureUrl}
            />

            <PasswordInput label="Password" onChange={setPassword} value={password} />
            <PasswordInput label="Confirm password" onChange={setConfirmPassword} value={confirmPassword} />

            {error ? <p className="text-sm text-red-300">{error}</p> : null}

            <button
              className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function TextInput({
  label,
  onChange,
  required,
  type = "text",
  value,
}: {
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

function PasswordInput({
  label,
  onChange,
  value,
}: {
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
