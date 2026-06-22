# Windows Clean-PC Deployment

This runbook installs the complete frontend, backend, PostgreSQL database, current
business data, custom administrator, email delivery, password recovery, and backups
on a clean Windows 10/11 computer.

## 1. Before leaving the source computer

1. Push and tag the deployment release in GitHub.
2. Open `Admin -> Settings -> Database backups`.
3. Create a manual `.tibackup`.
4. Copy the package from `backups/database` to encrypted removable storage.
5. Record the current `SESSION_SECRET` in a protected password manager.

The target must initially use that same `SESSION_SECRET`. The backup validates it
before restoring, and encrypted SMTP settings also depend on it.

## 2. Install prerequisites

1. Install all Windows updates.
2. Open administrator PowerShell and run:

   ```powershell
   wsl --install
   ```

3. Restart Windows.
4. Install Docker Desktop with the WSL 2 engine.
5. Install Git for Windows.
6. Verify:

   ```powershell
   docker --version
   docker compose version
   git --version
   ```

Node.js and PostgreSQL do not need separate installations.

## 3. Clone the deployment release

```powershell
New-Item -ItemType Directory -Force C:\ToolInventory
Set-Location C:\ToolInventory
git clone https://github.com/Othmanbelal/Talurit-search-engine.git app
Set-Location app
git checkout DEPLOYMENT_TAG
```

Replace `DEPLOYMENT_TAG` with the release tag created for this deployment.

## 4. Create persistent folders

```powershell
New-Item -ItemType Directory -Force C:\ToolInventory\backups\database
New-Item -ItemType Directory -Force C:\ToolInventory\uploads
```

Start with local backup storage. Move it to NAS only after the application and
restore have been verified.

## 5. Give the host a fixed LAN address

Configure a DHCP reservation in the router, for example `192.168.1.50`.
Users will open `http://192.168.1.50:5173`.

## 6. Create `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

Use URL-safe random database credentials so the password works inside
`DATABASE_URL`.

```env
NODE_ENV=production
CLIENT_URL=http://192.168.1.50:5173
APP_PUBLIC_URL=http://192.168.1.50:5173

POSTGRES_DB=tool_inventory
POSTGRES_USER=tool_user
POSTGRES_PASSWORD=LONG_URL_SAFE_RANDOM_VALUE
DATABASE_URL=postgresql://tool_user:LONG_URL_SAFE_RANDOM_VALUE@localhost:5432/tool_inventory

SESSION_SECRET=THE_SECRET_USED_WHEN_THE_BACKUP_WAS_CREATED
COOKIE_NAME=tool_inventory_session
SESSION_DAYS=7
PASSWORD_RESET_MINUTES=30

ADMIN_EMAIL=new-admin@company.com
ADMIN_PASSWORD=LONG_UNIQUE_ADMIN_PASSWORD
ADMIN_NAME=Administrator Name

SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=approved-mailbox@company.com
SMTP_PASS=SMTP_PASSWORD
SMTP_FROM=Tool Inventory <approved-mailbox@company.com>
SMTP_SECURE=false
ADMIN_SUMMARY_EMAIL=new-admin@company.com

BACKUP_HOST_DIR=C:/ToolInventory/backups
UPLOAD_HOST_DIR=C:/ToolInventory/uploads
```

Do not use `admin@example.com`, `ChangeMe123`, or the example secret values.

## 7. Start the clean stack

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose run --rm server npm --workspace server run db:seed
docker compose ps
```

Open `http://localhost:5173` and sign in with the new administrator.

## 8. Restore the source data

1. Copy the `.tibackup` into `C:\ToolInventory\backups\database`.
2. Sign in and open `Admin -> Settings -> Database backups`.
3. Select the package and enter its exact filename.
4. Run restore and wait for completion.

The restore temporarily brings back the old administrators, item notes, and urgent
issues because it restores the complete source database.

## 9. Remove deployment-excluded data

From `C:\ToolInventory\app`, run exactly:

```powershell
npm run deployment:prepare-data -- -Confirmation REMOVE-NOTES-ISSUES-AND-ADMINS
```

The guarded command:

- stops frontend/backend access;
- removes item notes and urgent issues;
- removes sessions, reset tokens, invitations, and old admin accounts;
- preserves non-admin users and all inventory/warehouse business data;
- creates the custom administrator from `.env`;
- restarts the application;
- prints verification counts.

Historical creator references use `SET NULL`; deleting admins does not delete
inventory, warehouses, stock movements, imports, or slot assignments.

## 10. Verify

Confirm:

- the custom administrator can sign in;
- preserved non-admin users remain;
- inventory, stock balances, warehouses, shelves, slots, and assignments match;
- item notes and urgent issues are empty;
- `Admin -> Settings -> Send test email` succeeds;
- `Forgot password?` sends a link;
- the link expires, is single-use, and signs out old sessions;
- a new full backup succeeds.

## 11. Open only the frontend firewall port

Run administrator PowerShell:

```powershell
New-NetFirewallRule `
  -DisplayName "Tool Inventory Frontend" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 5173 `
  -Action Allow `
  -Profile Private
```

PostgreSQL `5432` and backend `4000` are not published by production Docker
Compose. Only containers on Docker's private network can reach them.

## 12. Move backups to NAS

After local deployment is verified, map the NAS to `Z:` and change only `.env`:

```env
BACKUP_HOST_DIR=Z:/ToolInventoryBackups
```

Restart normally:

```powershell
docker compose down
docker compose up -d
```

Keep the admin backup destination as:

```text
/app/backups/database
```

Test the destination, then enable automatic backups. Never use
`docker compose down -v`; `-v` deletes the PostgreSQL volume.
