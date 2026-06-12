#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

backup_file="${1:-}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for database restore." >&2
  exit 1
fi

if [[ -z "${backup_file}" || ! -f "${backup_file}" ]]; then
  echo "Usage: npm run restore:db -- backups/database/<backup-file>.dump" >&2
  exit 1
fi

# Restore is intentionally explicit because it can replace existing database objects.
pg_restore --clean --if-exists --no-owner --dbname "${DATABASE_URL}" "${backup_file}"

echo "Database restored from: ${backup_file}"
