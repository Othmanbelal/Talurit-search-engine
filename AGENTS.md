# AGENTS.md

## Project

Tool Inventory System

## Purpose

This project replaces an Excel-based tool room inventory with a professional database-backed web application.

The current direction is a structured inventory platform with an assisted Excel import engine.
Excel workbooks are scanned, mapped, staged, reviewed, and then imported into clean inventory models.
PostgreSQL is the source of truth.

## Non-Negotiable Rules

- No source code file may exceed 350 lines unless explicitly exempt below.
- Schema files, AGENTS.md, and PLAN.md may exceed 350 lines when splitting would make them harder to maintain.
- Split any file before it becomes too large.
- Keep UI, hooks, services, validation, database logic, import mapping logic, and route logic separated.
- Do not put API calls directly inside visual components.
- Do not put database queries directly inside controllers.
- Do not hardcode secrets.
- Do not store plain passwords.
- Do not leave placeholder implementations.
- Do not leave fake TODOs.
- Keep TypeScript strict.
- Add useful comments to important logic.
- Do not over-comment obvious code.
- Every phase must update PLAN.md.

## File Size Policy

Maximum checked source file length: 350 lines.

Line-check exceptions:
- prisma/*.prisma
- *.schema.ts
- *.schemas.ts
- AGENTS.md
- PLAN.md

Exception files should still be kept organized, but they are exempt from the hard 350-line limit.

If a file reaches 300 lines, split it into:
- smaller components
- hooks
- services
- repositories
- utilities
- constants
- types
- mapper files

Before finishing a phase, run:
npm run check:lines

## Excel Workbook Rules

Known workbook sheets:
- Verktygsrum
- Beläggning vrum
- OKUMA (ignored for raw machine-row import)
- HAAS (ignored for raw machine-row import)
- Blad1

Rules:
- Verktygsrum is the main inventory table.
- Beläggning vrum is a location map, not a tool table.
- OKUMA is no longer imported as raw machine rows.
- HAAS is no longer imported as raw machine rows.
- Blad1 is ignored.
- Never discard unknown Excel columns.
- Store original row/cell data in rawData JSON.
- Preview before saving.
- Show invalid rows.
- Show warnings.
- Detect likely duplicates.
- Allow admin confirmation.
- Log ImportBatch and ImportRowIssue.
- For Verktygsrum, keep PLAN/HYLLA/BACK as the location shelf/raw label.
- For Verktygsrum, keep FACK as the location compartment; do not combine it into rawLabel.
- For Beläggning vrum, mapRow/mapColumn belongs to the shelf-level location label from the cell.

## Structured Import Rules

- Do not blindly import Excel rows directly into final inventory tables.
- Do not create physical SQL tables per Excel sheet.
- Use logical InventoryGroup and InventoryTable records for UI grouping.
- The main model is InventoryItem + ItemIdentifier + ItemAttribute + StorageLocation + StockBalance.
- Import flow is upload, sheet selection, mapping, staging, preview, warning fixes, confirm.
- Every selected Excel sheet becomes an ImportSheet/StructuredImportSheet under one ImportBatch/StructuredImportBatch.
- Store raw parsed rows in ImportStagingRow before final import.
- Save user-approved mappings in ImportColumnMapping and reusable ImportProfile records.
- Users must be able to change suggested mappings before staging rows.
- Empty mapped Excel cells should stage as null, not as review errors.
- Missing location imports as unassigned stock by default; it must not block confirmation.
- For Verktygsrum, PLAN/HYLLA/BACK maps to StorageLocation.code and FACK maps to StockBalance.compartment.
- LAGER maps to StockBalance.quantity and ":-" maps to StockBalance.unitPrice.
- Formula totals are not source truth; calculate total value from quantity and unit price.
- Preserve source values in staging rawRow and mappedData.
- Confirm import creates new inventory item and stock-balance entries for each ready staging row; do not merge imported inventory rows automatically.
- Possible duplicates must be shown as review indicators that the user can verify or dismiss; duplicate detection must not collapse rows.
- Article identifiers are searchable matching aids, not globally unique inventory identity.
- Excel row numbers are import history only, not item identity.
- Deselected sheets must not appear in staging preview and must not block import confirmation.

## Inventory Placement Rules

- Structured imported inventories are the preferred path for new Excel workbooks.
- DynamicInventory is legacy fallback only and should not be the main workflow.
- Users can create Used In cards later, but stock source-of-truth data must stay in StockBalance.
- Users can manually create inventory groups and logical inventory tables.
- Users can remove inventory groups and logical inventory tables.
- Each logical inventory table can save its own visible-column settings.
- Each logical inventory table can save visible widget settings and a manager name in columnSettings.
- User-added table columns are represented as ItemAttribute records, not new physical SQL columns.
- Custom attribute columns can be shown/hidden per InventoryTable through saved columnSettings.
- Hidden table columns must still be shown in the clicked item/entry detail view.
- Users can manually add stock rows to a structured inventory table.
- Manual add forms should open in a panel/drawer instead of permanently occupying the table page.
- Destructive remove actions must use icon-only trash buttons with a confirmation prompt.
- StockBalance is the table-specific inventory entry. Archive, delete, notes, quantity, placement, and QR entry references are table-specific.
- InventoryItem stores shared item identity fields, identifiers, attributes, and picture URL.
- Opening an inventory row must show the full item/entry details, all mapped attributes, notes, picture, and uploaded QR code image.
- QR codes are user-uploaded images, not auto-generated codes.
- Uploaded files must use Supabase Storage or another real object-storage provider; do not use Render/local disk or database base64 fields for production uploads.
- PostgreSQL stores only storage references or metadata, not image binary/base64 payloads.
- Image display must go through authenticated backend media routes that create short-lived signed storage URLs.
- Taking stock out creates a TakenStockItem record, decreases the source StockBalance quantity, and can be returned later.
- Assigning stock to a Used In card creates a UsedInStockAssignment, decreases the source StockBalance quantity, and shows usage tags on the source row.
- Returning taken or used stock must increase the original StockBalance quantity and mark the movement record returned.
- Used In cards may have named spots. If a card has spots, each used unit must choose one empty spot.
- One Used In spot may hold only one active item assignment at a time.
- Used In card details must group assigned structured rows by their original InventoryTable and use that table's visible-column settings.
- Manual stock row placement types include storage location, Used in, and Location in.
- A real inventory tool can be assigned to a valid storage location, assigned to a machine, or unassigned for review.
- Tool.locationId and Tool.machineId are mutually exclusive in normal app workflows.
- Valid storage labels use the shelf form P10A:8; FACK remains a separate compartment field.
- Numeric-only or malformed location labels must not be treated as valid storage positions.
- Malformed locations should be removed from normal location lists when safe, and affected tools should appear in the unassigned tools workflow.
- Do not store raw imported machine rows in the database.
- Normal machine pages must show real database Tool rows only.
- Adding an existing tool to a machine should move quantity from the source Tool row to a machine Tool row.
- If the same product/article/manufacturer already exists in the target machine, increase that machine row quantity instead of creating a duplicate.
- Machine transfers must not create or depend on imported raw machine-row data.

## Warehouse Integration Rules

- The warehouse designer from Future integration must become a real module inside this app, not a separate project.
- PostgreSQL remains the source of truth; browser/localStorage persistence is not acceptable for saved warehouse layouts.
- The 3D warehouse is a physical placement layer over structured inventory data, not a replacement for InventoryGroup, InventoryTable, StorageLocation, StockBalance, or StockMovement.
- Warehouse item placement must link to real StockBalance rows. Do not create fake inventory records just to show pallets in 3D.
- A warehouse layout can be linked to one or more InventoryGroup records and one or more InventoryTable records.
- Warehouse shelves and slots must adapt to the existing location style: StorageLocation.code uses values like P10A:1, and StockBalance.compartment stores FACK/bin values such as 1, 2, 3, or 4.
- Do not make generated labels like A-1-03 the primary location identity. They may exist only as optional display names or aliases.
- Warehouse slot generation should support patterns such as plan number 10, section A, positions 1-8, and FACK per position 1-4, producing P10A:1 / FACK 1 through P10A:8 / FACK 4.
- Database shelves should preferably be generated from saved 3D rack/shelf objects, not only from a manual detached form.
- When shelves are generated from a 3D object, persist or update a WarehouseObject row and link generated WarehouseShelf rows through WarehouseShelf.warehouseObjectId.
- The 3D object remains the physical source for position, rotation, size, and map placement; StorageLocation.code and WarehouseSlot.compartment remain the inventory location identity.
- A pallet rack can have a custom number of shelf levels, and each shelf level can have a custom number of EU-pallet-sized physical slots.
- WarehouseShelf represents a physical rack shelf level when shelfKind is rack_level; WarehouseSlot represents one physical pallet position.
- StorageLocation.code values such as P10A:1 are assigned to WarehouseSlot.code/normalizedCode as the inventory matching key, not treated as the physical rack level.
- WarehouseSlot.compartment stores the optional FACK/bin for matching inventory rows more precisely.
- Rack slot creation from a 3D rack must use a focused rack slot designer: choose shelf levels, choose slots per shelf, then click each slot to assign its location ID/FACK.
- Do not blindly auto-name rack slots as final inventory locations without user review. Sequential generation may be a helper only when the user confirms the resulting slot IDs.
- Empty physical rack slots are valid. Save them as available slots without exposing internal placeholder codes to users.
- When a linked inventory row matches a slot location/FACK, the 3D view should render a pallet in that physical slot.
- Warehouse slots should link to an existing StorageLocation when the code already exists; otherwise the app may create the missing StorageLocation through validated workflows.
- One warehouse slot can hold one active stock assignment by default unless a later configuration explicitly allows more.
- Occupied/free state must be calculated from active WarehouseSlotAssignment records, not from visual state.
- The warehouse map view and 3D view must read the same warehouse shelves, slots, and assignments from the database.
- The shelf map view must preserve the physical arrangement of shelves from the saved warehouse layout and allow slot editing without needing to use 3D.
- Users must be able to add, rename, and delete empty shelves/slots from the shelf map view.
- Users must be able to assign, unassign, and move inventory rows between warehouse slots through normal inventory workflows.
- When a StockBalance row is assigned to a warehouse slot, the 3D view should render a Euro pallet at that slot.
- Clicking View in warehouse from an inventory row should open the warehouse 3D view focused on the assigned pallet/slot.
- Clicking an occupied pallet or slot should open the linked inventory row details.
- Warehouse APIs must follow the same backend layering rules: routes define URLs, controllers handle request/response, services hold business logic, repositories hold database access, and schemas validate input.
- Warehouse permissions should follow least privilege: admin full control, manager edit/assign, employee assign/unassign, viewer read-only.

## Architecture

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS

Backend:
- Node.js
- Express
- TypeScript
- Prisma
- PostgreSQL

Deployment:
- Docker Compose

## Backend Layering

Routes:
Only define URLs and middleware.

Controllers:
Only handle request and response.

Services:
Business logic.

Repositories:
Database access only.

Mappers:
Excel-specific parsing and mapping only.

Schemas:
Validation only.

Types:
Type definitions only.

Utils:
Generic reusable helpers only.

## Frontend Layering

Pages:
Compose page sections.

Components:
Render UI.

Hooks:
Reusable state and behavior.

Services:
HTTP/API calls.

Types:
Shared TypeScript models.

Constants:
Routes, statuses, roles, theme values.

## Security

- Passwords must be hashed with argon2 or bcrypt.
- Use httpOnly cookies for sessions.
- Protect authenticated routes.
- Protect admin routes with role checks.
- Admins invite users by email; admins must not directly create passwords for users.
- Invitation tokens must be random, hashed at rest, expiring, single-use, and never logged.
- Never expose secrets to the frontend.
- Validate all backend inputs with Zod.
- Use least-privilege role checks for every sensitive API route.
- Never trust frontend role, user id, filter, sort, pagination, file, or import data.
- Keep session tokens random, hashed at rest, expiring, and removable on logout.
- Set secure cookie flags appropriately for the deployment environment.
- Avoid leaking stack traces, database details, secrets, hashes, or raw internal errors in API responses.
- Sanitize and validate Excel uploads before parsing; enforce file size and file type limits.
- The required xlsx package has npm advisories with no direct fix; keep imports admin-only and reassess parser choice if project requirements allow.
- Use Prisma parameterized queries; do not build SQL from user-controlled strings.
- Do not log passwords, session tokens, reset tokens, SMTP credentials, database URLs, or raw uploaded workbooks.
- Add rate limiting for login, password reset, import, export, backup, and admin mutation routes before production use.
- Add audit/history logging for important inventory and admin changes.
- README must include production security setup notes, especially strong secrets, HTTPS, backups, SMTP credentials, and admin password rotation.

## Backup Rules

- Use pg_dump for PostgreSQL backup.
- Daily backup job required.
- Weekly Excel export backup required.
- Store backup status in BackupLog.
- README must explain that backups should be copied outside the server.

## Email Rules

- Email must work through free-capable SMTP first; do not require a paid email API.
- The app may use company SMTP, Gmail/Outlook SMTP, or a self-hosted SMTP relay configured by environment variables.
- If optional providers are added later, they must remain optional and must not replace SMTP.
- User invitation emails must use the same email module as weekly summaries.
- If SMTP is missing, show: "Email is not configured. Invitations and weekly summaries cannot be sent yet."
- SMTP failure must not crash the app; pending invitations remain pending and can be resent.
- Admin settings must include a Send test email action.
- Admin settings must allow SMTP host, port, user, password, from address, secure flag, and summary recipient to be saved in the database.
- SMTP passwords saved from the admin UI must be encrypted at rest and must never be returned by API responses.
- Weekly summary email must be generated automatically.
- Use SMTP environment variables.
- Do not hardcode email credentials.
- Log sent/failed summaries in WeeklySummaryLog.

## Current SMTP Blocker

Microsoft rejected the current SMTP test with:
"SmtpClientAuthentication is disabled for the Tenant."

The app configuration can see SMTP values, but Microsoft 365 is blocking SMTP AUTH.

Ask IT for:
- A dedicated mailbox if possible: tool-inventory@talurit.se.
- Authenticated SMTP enabled for that mailbox.
- SMTP client submission allowed for Microsoft 365.
- Confirmation whether MFA, Security Defaults, or tenant authentication policies block SMTP AUTH.
- If SMTP AUTH is not allowed, a company-approved SMTP relay with host, port, auth method, sender address, and IP allowlist requirements.

Expected Microsoft 365 settings:
- SMTP_HOST=smtp.office365.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=tool-inventory@talurit.se or the approved mailbox
- SMTP_FROM=tool-inventory@talurit.se or the approved mailbox

After IT provides the final values, put them in .env, restart the server container, and use Admin Settings -> Send test email.

## User And Role Rules

- Admins invite users by email instead of directly creating active accounts.
- Role spelling is exactly: admin, manager, employee, viewer.
- Invited users set their own password from a secure invitation link.
- Every user, including the first admin, must have a UserProfile record.
- User profiles include first name, last name, email from User, phone number, and profile picture URL.
- Use a dedicated UserInvitation model; do not reuse PasswordResetToken.
- Invitation links must use APP_PUBLIC_URL + "/accept-invite?token=" + rawToken.
- Existing role checks must be updated when the employee role is added.

## UI Rules

The UI must feel premium and industrial:
- dark navy background
- glass panels
- soft borders
- rounded corners
- professional spacing
- readable tables
- clear filters
- responsive layout

Avoid:
- ugly default tables
- crowded forms
- giant components
- inconsistent spacing

## QR Scan Rules

- Dashboard must keep a visible QR scan action for authenticated users.
- Scanning opens the camera on supported devices and also allows manual code entry.
- Uploaded QR code images are user-managed assets; URLs must stay hidden from normal users.
- When a QR image is uploaded, decode the QR payload and save it as hidden item data.
- A scanned QR should show the matched item picture, table, location/FACK, warehouse placement, managers, and used-in state.
- If no item matches the scanned QR payload, show a clear not-linked message.
- Scan result actions should support Take out / Use in for roles allowed to move stock.
- Scan result actions should allow permitted users to add item notes or report urgent issues.
- "Take me there" must route to the correct inventory table and highlight the matching row.

## Stock Movement Visibility Rules

- Inventory table rows must show active stock movement tags under the item name.
- Active Used In assignments should display quantity, card name, and the user who assigned the item.
- Active taken-out items should display quantity and the user who took the item.
- Returned movements must disappear from active row tags because their returnedAt value is set.

## Warehouse Assignment Rules

- Warehouse slot assignment is a visual mapping layer only.
- Assigning an inventory row to a warehouse slot must not change quantity, placement, FACK, or stock movement history.
- Slot assignments must link to an existing StockBalance row from a table or group linked to the warehouse.
- Slot assignment should support selecting from linked inventory rows and scanning an item QR code.
- A warehouse slot may show the assigned row's existing placement and FACK, but must not rewrite those fields.
- Inventory rows with an active warehouse slot assignment should expose a 3D action that opens and focuses the assigned warehouse slot.

## Local Network Hosting Rules

- The application may be hosted fully on a local server/workstation with Docker Compose.
- Local network hosting uses local PostgreSQL, local backend, and local frontend containers.
- Users on the same network access the app through the host machine LAN IP and port 5173.
- Supabase database data can be copied into local PostgreSQL with `scripts/pull-supabase-to-local.ps1`.
- The Supabase database URL is a one-time migration secret and must not be committed.
- Supabase Storage media references need a separate storage migration before Supabase can be shut down completely.

## Phase Completion Format

At the end of each phase, report:
- Files created
- Files changed
- What works now
- How to run it
- Known limitations
- Confirmation that no non-schema source file exceeds 350 lines
