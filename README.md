# Tool Inventory System

Professional internal web application for replacing the Excel-based tool room workbook with a PostgreSQL-backed inventory system.

The workbook `VERKTYGSRUM.xlsx` / `VERKTYGSRUM(1).xlsx` is treated as import/export data only. PostgreSQL is the source of truth after import.

## Current Phase

This repository currently contains Phase 0 through Phase 10 work:

- permanent project instructions in `AGENTS.md`
- implementation plan in `PLAN.md`
- Docker Compose foundation with PostgreSQL
- Express TypeScript API with auth, inventory, import/export, admin, and health routes
- React TypeScript Vite client with Tailwind styling
- Prisma domain schema and migrations
- assisted Excel import with sheet selection, column mapping, staging rows, preview, and confirmation
- structured inventory records for items, identifiers, attributes, locations, stock balances, and stock movements
- admin invitation flow and SMTP email settings
- line-count guardrail script

## Requirements

- Node.js 20+
- npm 10+
- Docker and Docker Compose
- PostgreSQL client tools for backup scripts, if running backups outside Docker

## Local Setup

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start PostgreSQL:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres
   ```

4. Run the first Prisma migration:

   ```bash
   npm run db:migrate
   ```

5. Start the development servers:

   ```bash
   npm run dev
   ```

Frontend: `http://localhost:5173`

Backend health: `http://localhost:4000/api/health`

## Excel Import Direction

Excel is not copied into one large SQL table, and the app does not create physical tables per sheet.

The assisted import flow is:

```text
Upload workbook -> choose sheets -> map columns -> stage rows -> fix warnings -> confirm import
```

Confirmed rows are written to normalized inventory records:

- manufacturers
- categories
- inventory items
- item identifiers
- item attributes
- storage locations
- stock balances
- stock movements
- logical inventory groups and tables

## Docker Compose

Build and start all services:

```bash
docker compose up --build
```

The production compose file includes:

- `postgres`
- `server`
- `client`

## Local Network Hosting

Use this mode when the application should run only inside the company/local network.
For a complete clean-Windows-computer migration, including data restore and old-admin
cleanup, follow `docs/deployment/windows-clean-pc.md`.

Architecture:

```text
Local server or workstation
-> Docker PostgreSQL
-> Docker Express backend
-> Docker Nginx/React frontend
-> users open http://SERVER_LAN_IP:5173
```

1. Find the LAN IP address of the machine that will host the app:

   ```powershell
   ipconfig
   ```

2. Set `.env` to the local address, replacing the IP with the host machine IP:

   ```env
   CLIENT_URL=http://192.168.1.50:5173
   APP_PUBLIC_URL=http://192.168.1.50:5173
   DATABASE_URL=postgresql://tool_user:tool_password@localhost:5432/tool_inventory
   ```

3. Start the local stack:

   ```powershell
   docker compose up -d --build
   ```

4. Open the app:

   ```text
   http://192.168.1.50:5173
   ```

5. If other computers cannot open it, allow inbound Windows Firewall traffic for TCP ports:

   ```text
   5173 frontend
   4000 backend, normally only needed for diagnostics
   ```

### Pull Supabase Data Into Local PostgreSQL

This replaces the local Docker database with a copy of the Supabase database. It does not change Supabase.

This is a one-time migration from Supabase into the local Docker database. Do not add the Supabase source URL to `.env`.

Run:

```powershell
npm run db:pull:supabase -- -Force
```

The script prompts for the Supabase database URL, uses it once, and does not save it.

The script:

- starts local PostgreSQL
- stops local app containers before restore
- backs up the existing local database into `backups/database`
- dumps Supabase into `backups/database`
- replaces the local Docker database with that dump
- starts the backend and frontend again

Important:

- Do not put the real Supabase source database URL in `.env` or Git.
- After this one-time pull, the local app uses the local Docker PostgreSQL database.
- Uploaded pictures and QR images may still be stored in Supabase Storage if the database contains `supabase://...` media references. For a fully offline server, migrate storage files to local or company-hosted object storage before shutting down Supabase.

## File Storage

Uploaded item pictures, QR images, and profile pictures use Supabase Storage in production. PostgreSQL stores only storage references; image bytes are not stored in normal database text fields, and Render/local disk is not used for production uploads.

Create a private Supabase Storage bucket, or let the configured service role upload to an existing private bucket, then set these variables on Render and in local `.env` when uploads are needed:

```env
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=tool-inventory-uploads
SUPABASE_SIGNED_URL_SECONDS=3600
```

The service role key is a backend secret. Do not put it in Vercel or any frontend environment.

Images are rendered through the backend media endpoint, which creates a short-lived signed Supabase URL for authenticated users.

## Email Setup

Email is SMTP-first and does not require a paid email API. Configure initial fallback values in `.env` or your server environment:

```env
APP_PUBLIC_URL=http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_SECURE=false
ADMIN_SUMMARY_EMAIL=
```

`APP_PUBLIC_URL` is used for invitation links, for example:

```text
http://localhost:5173/accept-invite?token=...
```

If SMTP is not configured, the admin UI shows:

```text
Email is not configured. Invitations and weekly summaries cannot be sent yet.
```

Pending invitations remain stored and can be resent after SMTP is fixed.
The login page also supports single-use password reset links. Reset links expire after
`PASSWORD_RESET_MINUTES` and require working SMTP plus the correct `APP_PUBLIC_URL`.

Admins can also configure SMTP from `/admin/settings`. Values saved there are stored in the database. The SMTP password is encrypted at rest and is not returned by API responses.

## Root Commands

```bash
npm install
npm run dev
npm run dev:server
npm run dev:client
npm run db:migrate
npm run db:seed
npm run db:studio
npm run build
npm run lint
npm run check:lines
npm run backup:db
npm run restore:db
```

## Backups

Full application backups are written to `backups/database` and managed from
`Admin -> Settings -> Database backups`.

New backups use the `.tibackup` package format. Each package includes:

- the complete PostgreSQL database, including every table, row, relation, constraint, sequence, and migration record
- inventory groups, tables, items, stock rows, locations, FACK values, notes, movement history, and imports
- warehouse layouts, 3D layout JSON, shelves, physical slots, and item-to-slot assignments
- users, password hashes, roles, invitations, sessions, application settings, and resource-manager assignments
- used-in assignments, taken items, urgent issues, notes, interaction logs, and audit/history records
- every application-managed item picture, QR image, and profile image stored in Supabase Storage
- every file inside the persistent local uploads folder
- a manifest with file sizes, SHA-256 checksums, format version, and required configuration fingerprint

The backup center supports:

- manual full application backups
- automatic backups at a configurable interval
- selecting a server-side destination inside the configured persistent backup root
- testing whether the backend can write to the destination
- viewing the last backup and last restore
- viewing full `.tibackup` packages, legacy `.dump` files, and recent backup activity
- restoring a selected backup after exact filename confirmation
- creating a safety backup automatically before every restore

Before restoring, the backend verifies the archive paths, manifest, every checksum, PostgreSQL dump, and
the `SESSION_SECRET` fingerprint. It then creates a new full safety backup. Restores use a single
PostgreSQL transaction, restore managed media and local uploads, and reapply Prisma migrations. If the
restore fails after it starts, the backend attempts to restore the safety package automatically.
Other API requests receive a temporary maintenance response while a backup or restore is running.

The following deployment values are intentionally not placed inside downloadable backup packages:

- `.env` secrets
- `SESSION_SECRET`
- Supabase service-role keys
- SMTP environment passwords
- operating-system, Docker, firewall, and source-code files

Keep those values in a separate protected administrator/IT secret store. A restore requires the same
`SESSION_SECRET`; this is checked before data is changed. Supabase credentials must also be configured
when the package contains Supabase-managed media. External image URLs are preserved exactly in the
database, but files owned by unrelated external websites cannot be controlled by this application.

### Local, OneDrive, SharePoint, or NAS destination

When Docker is used, the host backup destination is configured with `BACKUP_HOST_DIR`. Docker mounts that
host folder into `/app/backups`, which is the persistent root shown in the admin page.

Examples:

```env
BACKUP_HOST_DIR=./backups
BACKUP_HOST_DIR=C:/Users/BackupUser/Company/Tool Inventory Backups
BACKUP_HOST_DIR=Z:/ToolInventoryBackups
```

After changing `BACKUP_HOST_DIR`, restart the containers:

```powershell
docker compose down
docker compose up -d --build
```

Inside the admin page, use a destination such as:

```text
/app/backups/database
```

The browser cannot give the server permanent access to an arbitrary folder on the administrator's own
computer. The folder must exist on the server or be mounted into the backend container.

Excel export backups will be written to:

```text
backups/excel
```

A backup on the same server is not enough. A server disk failure, ransomware event, accidental deletion, or hosting account problem can destroy both the application and its local backups.

Copy backups regularly to at least one location outside the application server, such as:

- another company server
- company NAS
- SharePoint
- external encrypted storage
- secure cloud storage

## Security Notes

- Use a long random `SESSION_SECRET` in production.
- Run the app behind HTTPS so session cookies and invitation links are protected in transit.
- Admins invite users by email; users set their own passwords.
- Invitation tokens are random, hashed in the database, expiring, and single-use.
- Excel import is admin-only and size-limited. The required `xlsx` package currently has npm audit advisories with no direct npm fix, so only trusted admins should import trusted workbooks.
