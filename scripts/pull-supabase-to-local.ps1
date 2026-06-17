param(
  [string]$SourceDatabaseUrl = $env:SUPABASE_DATABASE_URL,
  [switch]$Force,
  [switch]$SkipLocalBackup
)

$ErrorActionPreference = "Stop"

if (-not $SourceDatabaseUrl) {
  throw "SUPABASE_DATABASE_URL is required. Set it only in your local shell, not in Git."
}

if (-not $Force) {
  throw "This replaces the local Docker database. Re-run with -Force after confirming you have the correct Supabase URL."
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backupDir = Join-Path $root "backups\database"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$remoteDumpName = "supabase-pull-$timestamp.dump"
$localBackupName = "local-before-supabase-pull-$timestamp.dump"

function Invoke-Step {
  param([string]$Message, [scriptblock]$Command)
  Write-Host "==> $Message"
  & $Command
}

function Wait-Postgres {
  for ($i = 0; $i -lt 60; $i++) {
    $ok = docker compose exec -T postgres pg_isready -U tool_user -d tool_inventory 2>$null
    if ($LASTEXITCODE -eq 0) { return }
    Start-Sleep -Seconds 2
  }
  throw "Local PostgreSQL did not become ready."
}

Set-Location $root
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$backupDirResolved = (Resolve-Path $backupDir).Path

Invoke-Step "Starting local PostgreSQL" {
  docker compose up -d postgres
  Wait-Postgres
}

# Stop app containers so the database can be replaced without active connections.
Invoke-Step "Stopping local app containers before restore" {
  docker compose stop server client 2>$null | Out-Null
}

if (-not $SkipLocalBackup) {
  Invoke-Step "Backing up current local database to $localBackupName" {
    docker compose exec -T postgres sh -c "PGPASSWORD=tool_password pg_dump -U tool_user -d tool_inventory --format=custom --no-owner --no-privileges --file=/tmp/$localBackupName"
    docker cp "tool_inventory_postgres:/tmp/$localBackupName" (Join-Path $backupDir $localBackupName)
    docker compose exec -T postgres rm -f "/tmp/$localBackupName"
  }
}

Invoke-Step "Dumping Supabase database to local backup folder" {
  $dumpCommand = "pg_dump --format=custom --no-owner --no-privileges --file=/backups/$remoteDumpName `"`$SOURCE_DATABASE_URL`""
  docker run --rm `
    -e "SOURCE_DATABASE_URL=$SourceDatabaseUrl" `
    -v "${backupDirResolved}:/backups" `
    postgres:16-alpine sh -c $dumpCommand
}

Invoke-Step "Replacing local database with Supabase dump" {
  docker cp (Join-Path $backupDir $remoteDumpName) "tool_inventory_postgres:/tmp/$remoteDumpName"
  docker compose exec -T postgres sh -c "PGPASSWORD=tool_password dropdb --force --if-exists -U tool_user tool_inventory && PGPASSWORD=tool_password createdb -U tool_user tool_inventory && PGPASSWORD=tool_password pg_restore -U tool_user -d tool_inventory --no-owner --no-privileges /tmp/$remoteDumpName"
  docker compose exec -T postgres rm -f "/tmp/$remoteDumpName"
}

Invoke-Step "Starting local backend and frontend" {
  docker compose up -d --build server client
}

Write-Host ""
Write-Host "Local database is now restored from Supabase."
Write-Host "Supabase dump: backups/database/$remoteDumpName"
if (-not $SkipLocalBackup) { Write-Host "Previous local backup: backups/database/$localBackupName" }
Write-Host "Open the app from this machine: http://localhost:5173"
