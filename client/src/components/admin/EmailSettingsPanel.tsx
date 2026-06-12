import { FormEvent, type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { MailCheck, Save, Send } from "lucide-react";
import type { AdminSettings, AdminSettingsPayload } from "../../types/admin";

type EmailSettingsPanelProps = {
  isLoading: boolean;
  onSave: (payload: AdminSettingsPayload) => Promise<unknown>;
  onSendTest: (email?: string) => Promise<{ sentTo: string }>;
  settings: AdminSettings | null;
};

export function EmailSettingsPanel(props: EmailSettingsPanelProps) {
  const { isLoading, onSave, onSendTest, settings } = props;
  const [form, setForm] = useState(defaultForm);
  const [testEmail, setTestEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    setForm({
      weeklySummaryEmail: settings.weeklySummaryEmail,
      smtpHost: settings.smtp.smtpHost,
      smtpPort: settings.smtp.smtpPort,
      smtpUser: settings.smtp.smtpUser,
      smtpPass: "",
      smtpFrom: settings.smtp.smtpFrom,
      smtpSecure: settings.smtp.smtpSecure,
    });
  }, [settings]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(async () => {
      await onSave(form);
      return "Settings saved to the database.";
    });
  }

  async function handleSendTest() {
    await runAction(async () => {
      const result = await onSendTest(testEmail || undefined);
      return `Test email sent to ${result.sentTo}.`;
    });
  }

  async function runAction(action: () => Promise<string>) {
    setError(null);
    setMessage(null);

    try {
      setMessage(await action());
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Email action failed");
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-industrial">
      <Header />
      {settings?.email.warning ? <Warning message={settings.email.warning} /> : null}
      <Status settings={settings} />

      <form className="space-y-4" onSubmit={handleSave}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="SMTP host" name="smtpHost" onChange={setForm} value={form.smtpHost} />
          <NumberField label="SMTP port" onChange={setForm} value={form.smtpPort} />
          <TextField label="SMTP user" name="smtpUser" onChange={setForm} value={form.smtpUser} />
          <TextField label="SMTP from" name="smtpFrom" onChange={setForm} value={form.smtpFrom} />
          <PasswordField
            configured={settings?.smtp.smtpPasswordConfigured ?? false}
            onChange={setForm}
            value={form.smtpPass ?? ""}
          />
          <SecureSelect onChange={setForm} value={form.smtpSecure} />
        </div>

        <TextField
          label="Weekly summary recipient"
          name="weeklySummaryEmail"
          onChange={setForm}
          value={form.weeklySummaryEmail}
        />

        <button
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:border-accent disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          <Save size={16} /> Save SMTP settings
        </button>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <TextInput
          label="Test recipient"
          onChange={setTestEmail}
          placeholder="Uses configured admin email if blank"
          type="email"
          value={testEmail}
        />
        <button
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          disabled={isLoading}
          onClick={() => void handleSendTest()}
          type="button"
        >
          <Send size={16} /> Send test email
        </button>
      </div>

      {message ? <p className="mt-4 text-sm text-green-300">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
    </section>
  );
}

const defaultForm: AdminSettingsPayload = {
  weeklySummaryEmail: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
  smtpSecure: false,
};

function Header() {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
        <MailCheck aria-hidden="true" size={20} />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Email settings</h2>
        <p className="mt-1 text-sm text-slate-400">SMTP values are saved to the database.</p>
      </div>
    </div>
  );
}

function Warning({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
      {message}
    </div>
  );
}

function Status({ settings }: { settings: AdminSettings | null }) {
  return (
    <div className="mb-5 grid gap-3 text-sm text-slate-300 md:grid-cols-3">
      <Info label="SMTP host" value={settings?.email.host ?? "Not configured"} />
      <Info label="SMTP from" value={settings?.email.from ?? "Not configured"} />
      <Info label="Password" value={settings?.email.passwordConfigured ? "Configured" : "Not configured"} />
    </div>
  );
}

function TextField({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: keyof AdminSettingsPayload;
  onChange: Dispatch<SetStateAction<AdminSettingsPayload>>;
  value: string;
}) {
  return (
    <TextInput
      label={label}
      onChange={(next) => onChange((current) => ({ ...current, [name]: next }))}
      type={name === "weeklySummaryEmail" || name === "smtpFrom" ? "email" : "text"}
      value={value}
    />
  );
}

function NumberField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: Dispatch<SetStateAction<AdminSettingsPayload>>;
  value: number;
}) {
  return (
    <TextInput
      label={label}
      onChange={(next) => onChange((current) => ({ ...current, smtpPort: Number(next) }))}
      type="number"
      value={value.toString()}
    />
  );
}

function PasswordField({
  configured,
  onChange,
  value,
}: {
  configured: boolean;
  onChange: Dispatch<SetStateAction<AdminSettingsPayload>>;
  value: string;
}) {
  return (
    <TextInput
      label={configured ? "SMTP password (configured)" : "SMTP password"}
      onChange={(next) => onChange((current) => ({ ...current, smtpPass: next }))}
      placeholder={configured ? "Leave blank to keep current password" : ""}
      type="password"
      value={value}
    />
  );
}

function SecureSelect({
  onChange,
  value,
}: {
  onChange: Dispatch<SetStateAction<AdminSettingsPayload>>;
  value: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">SMTP secure</span>
      <select
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
        onChange={(event) => onChange((current) => ({ ...current, smtpSecure: event.target.value === "true" }))}
        value={value.toString()}
      >
        <option value="false">false / STARTTLS on 587</option>
        <option value="true">true / SSL on 465</option>
      </select>
    </label>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white/5 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-slate-200">{value}</div>
    </div>
  );
}
