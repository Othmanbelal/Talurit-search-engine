#!/usr/bin/env bash
set -euo pipefail

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required for database backup." >&2
  exit 1
fi

backup_root="${BACKUP_DIR:-./backups}"
backup_dir="${backup_root}/database"
timestamp="$(date +%Y%m%d_%H%M%S)"
backup_file="${backup_dir}/tool_inventory_${timestamp}.dump"

mkdir -p "${backup_dir}"

# Custom format keeps the backup compact and supports selective restore with pg_restore.
pg_dump "${DATABASE_URL}" --format=custom --file="${backup_file}"

echo "Database backup created: ${backup_file}"
