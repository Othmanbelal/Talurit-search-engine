import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { forgotPasswordRequest } from "../services/auth.service";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await forgotPasswordRequest(email);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed");
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
            <h1 className="text-xl font-semibold text-white">Reset password</h1>
            <p className="text-sm text-slate-400">Request a secure reset link by email.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">Email</span>
            <input
              autoComplete="email"
              className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          {message ? <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <Link className="mt-5 block text-center text-sm text-slate-300 hover:text-white" to="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
