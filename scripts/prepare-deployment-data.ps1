param(
  [Parameter(Mandatory = $true)]
  [string]$Confirmation
)

$ErrorActionPreference = "Stop"

if ($Confirmation -ne "REMOVE-NOTES-ISSUES-AND-ADMINS") {
  throw "Confirmation must exactly equal REMOVE-NOTES-ISSUES-AND-ADMINS."
}

Write-Host "Starting PostgreSQL and stopping application access..."
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) { throw "Could not start PostgreSQL." }
docker compose stop client server
if ($LASTEXITCODE -ne 0) { throw "Could not stop the application containers." }

$cleanupSql = @'
BEGIN;

DELETE FROM item_notes;
DELETE FROM urgent_issues;
DELETE FROM sessions;
DELETE FROM password_reset_tokens;
DELETE FROM user_invitations;
DELETE FROM users WHERE role = 'ADMIN';

COMMIT;
'@

Write-Host "Removing deployment-excluded records..."
$cleanupSql | docker compose exec -T postgres sh -lc `
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
if ($LASTEXITCODE -ne 0) {
  throw "Database cleanup failed. The transaction was rolled back."
}

Write-Host "Creating the custom administrator from .env..."
docker compose run --rm server npm --workspace server run db:seed
if ($LASTEXITCODE -ne 0) {
  throw "Admin creation failed. Correct ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME in .env, then rerun this command."
}

docker compose up -d server client
if ($LASTEXITCODE -ne 0) { throw "Could not restart the application." }

$verificationSql = @'
SELECT
  (SELECT count(*) FROM users WHERE role = 'ADMIN') AS admins,
  (SELECT count(*) FROM users WHERE role <> 'ADMIN') AS preserved_non_admins,
  (SELECT count(*) FROM item_notes) AS item_notes,
  (SELECT count(*) FROM urgent_issues) AS urgent_issues,
  (SELECT count(*) FROM inventory_items) AS inventory_items,
  (SELECT count(*) FROM stock_balances) AS stock_balances,
  (SELECT count(*) FROM warehouse_layouts) AS warehouses;
'@

Write-Host "Deployment data preparation completed:"
$verificationSql | docker compose exec -T postgres sh -lc `
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
