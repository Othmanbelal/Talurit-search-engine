import { AlertTriangle, DatabaseBackup, FolderCheck, Play, Save, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { useAdminBackups } from "../../hooks/useAdminBackups";
import type { BackupLogRecord, BackupSettings } from "../../types/admin";
import { formatDateTime } from "../../utils/format";
import { BackupFilesTable } from "./BackupFilesTable";
import { BackupStatusCards } from "./BackupStatusCards";

type Props = {
  backups: ReturnType<typeof useAdminBackups>;
};

export function BackupManagementPanel({ backups }: Props) {
  const [form, setForm] = useState<Omit<BackupSettings, "storageRoot">>({
    enabled: false,
    intervalHours: 24,
    directory: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [restoreFile, setRestoreFile] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    if (!backups.data) return;
    setForm({
      enabled: backups.data.settings.enabled,
      intervalHours: backups.data.settings.intervalHours,
      directory: backups.data.settings.directory,
    });
  }, [backups.data]);

  const isBusy = backups.activeAction !== null || Boolean(backups.data?.activeOperation);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      await backups.updateSettings(form);
      setMessage("Automatic backup settings saved.");
    } catch {
      // The hook exposes the API error in the panel.
    }
  }

  async function testDirectory() {
    setMessage(null);
    try {
      const result = await backups.testDirectory(form.directory);
      setForm((current) => ({ ...current, directory: result.directory }));
      setMessage("The backend can write to this backup folder.");
    } catch {
      // The hook exposes the API error in the panel.
    }
  }

  async function runBackup() {
    setMessage(null);
    try {
      await backups.runBackup();
      setMessage("Full application backup completed.");
    } catch {
      // The hook exposes the API error in the panel.
    }
  }

  async function runRestore() {
    if (!restoreFile) return;
    setMessage(null);
    try {
      await backups.restore(restoreFile, confirmation);
      setRestoreFile(null);
      setConfirmation("");
      setMessage("Full restore completed. You will be sent to the login page.");
      window.setTimeout(() => window.location.assign("/login"), 1500);
    } catch {
      // The hook exposes the API error in the panel.
    }
  }

  return (
    <section className="space-y-5 rounded-lg border border-line bg-panel p-5 shadow-industrial">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
            <DatabaseBackup size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Full application backups</h2>
            <p className="mt-1 text-sm text-slate-400">Back up the database, managed images, QR files, and local uploads together.</p>
          </div>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
          disabled={isBusy}
          onClick={() => void runBackup()}
          type="button"
        >
          <Play size={15} /> {backups.activeAction === "backup" ? "Backing up…" : "Full backup now"}
        </button>
      </header>

      {backups.error ? <ErrorBanner message={backups.error} /> : null}
      {message ? <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}
      {backups.data?.activeOperation ? (
        <p className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          A database {backups.data.activeOperation.kind} started at {formatDateTime(backups.data.activeOperation.startedAt)}.
        </p>
      ) : null}

      <BackupStatusCards data={backups.data} />

      <form className="space-y-4 rounded-md border border-line bg-slate-950/30 p-4" onSubmit={(event) => void saveSettings(event)}>
        <div>
          <h3 className="font-semibold text-white">Automatic backup settings</h3>
          <p className="mt-1 text-xs text-slate-500">
            The destination must be inside the persistent storage root shown below.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-md border border-line bg-white/[0.03] p-3">
          <input
            checked={form.enabled}
            className="h-4 w-4 accent-amber-400"
            onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-medium text-slate-200">Enable automatic backups</span>
            <span className="block text-xs text-slate-500">The backend checks the schedule once per minute.</span>
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-[180px_1fr]">
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Frequency in hours</span>
            <input
              className="w-full rounded-md border border-line bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              max={744}
              min={1}
              onChange={(event) => setForm((current) => ({ ...current, intervalHours: Number(event.target.value) }))}
              type="number"
              value={form.intervalHours}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-medium text-slate-300">Server backup directory</span>
            <input
              className="w-full rounded-md border border-line bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              onChange={(event) => setForm((current) => ({ ...current, directory: event.target.value }))}
              spellCheck={false}
              type="text"
              value={form.directory}
            />
          </label>
        </div>

        <div className="rounded-md border border-line bg-white/[0.02] p-3 text-xs text-slate-400">
          Persistent root: <span className="break-all font-mono text-slate-300">{backups.data?.settings.storageRoot ?? "Loading…"}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent disabled:opacity-50"
            disabled={isBusy}
            type="submit"
          >
            <Save size={15} /> Save schedule
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent disabled:opacity-50"
            disabled={isBusy || !form.directory.trim()}
            onClick={() => void testDirectory()}
            type="button"
          >
            <FolderCheck size={15} /> Test folder
          </button>
        </div>
      </form>

      <div>
        <h3 className="mb-3 font-semibold text-white">Available backups</h3>
        <BackupFilesTable
          files={backups.data?.files ?? []}
          isBusy={isBusy}
          onSelectRestore={(fileName) => {
            setRestoreFile(fileName);
            setConfirmation("");
          }}
        />
      </div>

      {restoreFile ? (
        <RestoreConfirmation
          confirmation={confirmation}
          fileName={restoreFile}
          isRestoring={backups.activeAction === "restore"}
          onCancel={() => {
            setRestoreFile(null);
            setConfirmation("");
          }}
          onChange={setConfirmation}
          onRestore={() => void runRestore()}
        />
      ) : null}

      <RecentOperations logs={backups.data?.logs ?? []} />
    </section>
  );
}

function RestoreConfirmation(props: {
  confirmation: string;
  fileName: string;
  isRestoring: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onRestore: () => void;
}) {
  return (
    <div className="rounded-md border border-red-400/30 bg-red-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 shrink-0 text-red-300" size={18} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-100">Confirm database restore</h3>
          <p className="mt-1 text-sm text-red-100/80">
            A safety backup is created first. Current database content will then be replaced by this backup.
          </p>
          <p className="mt-3 text-xs text-red-200">Type the complete filename to continue:</p>
          <p className="mt-1 break-all font-mono text-xs text-white">{props.fileName}</p>
          <input
            className="mt-2 w-full rounded-md border border-red-400/30 bg-slate-950 px-3 py-2 text-sm text-white"
            onChange={(event) => props.onChange(event.target.value)}
            value={props.confirmation}
          />
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-md bg-red-400 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              disabled={props.confirmation !== props.fileName || props.isRestoring}
              onClick={props.onRestore}
              type="button"
            >
              {props.isRestoring ? "Restoring…" : "Restore database"}
            </button>
            <button className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-sm text-slate-300" onClick={props.onCancel} type="button">
              <X size={14} /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecentOperations({ logs }: { logs: BackupLogRecord[] }) {
  return (
    <div>
      <h3 className="mb-3 font-semibold text-white">Recent backup activity</h3>
      <div className="divide-y divide-line rounded-md border border-line">
        {logs.slice(0, 8).map((log) => (
          <div className="grid gap-2 bg-white/[0.02] p-3 sm:grid-cols-[1fr_auto]" key={log.id}>
            <div>
              <p className="text-sm font-medium capitalize text-slate-200">{log.operation} · {log.trigger.replace("_", " ")}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{log.fileName ?? log.message ?? "No file"}</p>
            </div>
            <div className="sm:text-right">
              <p className={log.status === "SUCCESS" ? "text-sm text-emerald-300" : "text-sm text-red-300"}>{log.status}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(log.completedAt ?? log.createdAt)}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 ? <p className="p-4 text-center text-sm text-slate-500">No backup activity recorded.</p> : null}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{message}</p>;
}
