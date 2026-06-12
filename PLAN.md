# PLAN.md

## Current Goal

Build a self-hosted web application for managing a tool room inventory.

The system replaces the Excel workbook VERKTYGSRUM.xlsx / VERKTYGSRUM(1).xlsx with a real PostgreSQL database and a premium web interface.

## Current Status

Phase 0 through Phase 10 implementation complete, with the import direction corrected to a structured assisted import engine.

Docker database, migrations, seed, auth, dashboard, legacy tools UI, assisted Excel import, structured inventory views, admin invitations/settings, backend health, and frontend build are verified.

## Technical Direction

- Web application, not EXE.
- Self-hosted on user server with Docker Compose.
- PostgreSQL is the source of truth.
- New imported Excel workbooks are scanned, mapped, staged, reviewed, and confirmed into structured inventory records.
- Do not create physical SQL tables per Excel sheet.
- Use InventoryGroup and InventoryTable as logical UI tables.
- Use InventoryItem, ItemIdentifier, ItemAttribute, StorageLocation, StockBalance, and StockMovement as the source-of-truth inventory model.
- DynamicInventory is legacy fallback only and is not the main workflow.
- React, TypeScript, Vite, Tailwind CSS frontend.
- Node.js, Express, TypeScript, Prisma backend.
- Excel is only for previewed import and export.
- Security is a cross-cutting requirement for every phase.
- Warehouse integration is a first-class direction: saved warehouse layouts, shelf maps, 3D placement, and inventory slot assignments must be database-backed.
- Schema files, AGENTS.md, and PLAN.md are exempt from the 350-line limit; all other source files remain limited.

## Security Baseline

- Hash passwords and tokens; never store or log secrets.
- Use httpOnly cookies, route protection, role checks, Zod validation, and safe error responses.
- Admins invite users by email; invited users set their own passwords from expiring secure links.
- Add rate limits for auth/admin/import/export before production use.
- Validate uploads, preserve raw Excel data safely, and never execute workbook content.
- Document HTTPS, secret rotation, backup handling, and admin password rotation before final release.

## User Invitation And Email Direction

- Roles are admin, manager, employee, and viewer.
- Admins invite users; they do not directly create user passwords.
- Invitation emails must be sent by the app through SMTP first, using free-capable SMTP configuration.
- No paid email API is required; optional providers may be added later only as opt-in.
- Admin Settings must save SMTP host, port, user, password, from address, secure flag, and summary recipient to the database.
- SMTP passwords saved through the UI are encrypted at rest and are never returned by API responses.
- Every user, including admin users, has a profile with first name, last name, email, phone number, and profile picture URL.

## Inventory Placement Direction

- A tool can be in storage, in a machine, or unassigned for review.
- Storage labels must look like P10A:8; FACK remains its own compartment field.
- Tool.locationId and Tool.machineId are mutually exclusive in normal user workflows.
- Locations must show occupied/free state based on attached tools.
- Malformed or numeric-only locations must not be treated as valid storage.
- Tools with no valid storage or machine assignment appear in the unassigned tools workflow.
- Raw imported machine rows are no longer stored in the database.
- Normal machine pages now show real database Tool rows only.
- Adding a tool to a machine links an existing Tool row and transfers quantity from that source row into a machine Tool row.
- If the same product/article/manufacturer already exists in the target machine, the target machine row quantity is increased.

## Warehouse Integration Direction

- Integrate the Future integration warehouse designer into the inventory application as an internal Warehouses module.
- Warehouse layouts must be saved in PostgreSQL and loaded through backend APIs.
- The 3D warehouse view is a physical placement layer over structured inventory data.
- A warehouse can be attached to one or more InventoryGroup records and one or more InventoryTable records.
- Warehouse item assignments must link to StockBalance rows, because StockBalance is the real table-specific inventory entry.
- Warehouse shelves and slots must use the existing storage location language:
  - StorageLocation.code example: P10A:1
  - StockBalance.compartment/FACK example: 1
  - Full placement example: P10A:1 / FACK 1
- Generated slot names like A-1-03 should not be the primary inventory location. They can exist only as optional display labels or aliases.
- The warehouse slot generator should support creating ranges such as P10A:1 through P10A:8 with FACK 1 through FACK 4 under each location.
- The shelf map view must be separate from the 3D view and should show shelves according to their real saved warehouse positions.
- The map view must allow adding, renaming, and deleting empty shelves/slots, plus assigning and unassigning stock rows.
- The 3D view must render a Euro pallet only when a real StockBalance row is actively assigned to a warehouse slot.
- Inventory row details must eventually show the warehouse placement and provide View in warehouse to focus the 3D camera on the assigned pallet/slot.

## SMTP IT Request To Remember

Current blocker:
- Microsoft 365 rejects SMTP with: "SmtpClientAuthentication is disabled for the Tenant."
- The app reads SMTP values from .env, but Microsoft is blocking SMTP AUTH.

Ask IT for:
- A dedicated mailbox if possible: tool-inventory@talurit.se.
- Authenticated SMTP enabled for that mailbox.
- SMTP client submission allowed for Microsoft 365.
- Confirmation whether MFA, Security Defaults, or tenant authentication policies block SMTP AUTH.
- If SMTP AUTH is not allowed, a company-approved SMTP relay with host, port, auth method, sender address, and IP allowlist requirements.

Expected Microsoft 365 values:
- SMTP_HOST=smtp.office365.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=tool-inventory@talurit.se or approved mailbox
- SMTP_FROM=tool-inventory@talurit.se or approved mailbox

When IT provides values:
- Put them in .env, not .env.example.
- Run: docker compose up -d --force-recreate server
- Test from /admin/settings with Send test email.

## Phases

### Phase 0 - Documentation and Guardrails

Create AGENTS.md, PLAN.md, README.md, .env.example, and check-file-lines script.

Status: completed

### Phase 1 - Project Foundation

Create root scripts, Docker Compose, server, client, Prisma setup, health endpoint, and base Tailwind theme.

Status: completed

### Phase 2 - Database Schema and Seed

Create all required Prisma models and seed the first admin user plus OKUMA and HAAS.

Status: completed

### Phase 3 - Authentication and Roles

Implement login, logout, current user endpoint, session cookies, role middleware, and protected frontend route.

Status: completed

### Phase 4 - Tool Inventory API

Implement tool CRUD, search, filters, sorting, pagination, archive/restore, soft delete, history logging, validation, and role-protected mutations.

Status: completed

### Phase 5 - Premium App Shell and Dashboard

Implement login page, app shell, sidebar, topbar, dashboard cards, and admin dashboard data.

Status: completed

### Phase 6 - Tools Interface

Implement tools page, toolbar, filters, table, add/edit modal, details drawer, and archive/restore actions.

Status: completed

### Phase 7 - Sheet-Specific Excel Import Preview

Implement upload, workbook detection, sheet-specific mappers, preview data, invalid rows, warnings, and duplicates.

Status: completed

### Phase 8 - Excel Import Confirm and Export

Implement confirmed import persistence, metadata creation, import logs, and Excel export sheets.

Status: completed

### Phase 9 - Machine and Location Views

Implement machines, machine details, locations, and location map data view.

Status: completed

### Phase 10 - Admin Users and Settings

Implement admin user invitations, role editing, app settings, and weekly summary recipient setting.

Acceptance:
- Add employee role to the database and frontend role types.
- Admin can send an invitation email for admin, manager, employee, or viewer.
- Admin enters email, optional name, and role; the system creates a pending UserInvitation, not a password.
- Invite tokens are hashed, expiring, single-use, and can be resent or revoked.
- Invited user accepts the link, sets their own password, and can then log in.
- Invitation links use APP_PUBLIC_URL + "/accept-invite?token=" + rawToken.
- SMTP is the first email sender and must work without paid email APIs.
- If SMTP is missing, show: "Email is not configured. Invitations and weekly summaries cannot be sent yet."

Backend routes:
- POST /api/admin/invitations
- GET /api/admin/invitations
- POST /api/admin/invitations/:id/resend
- POST /api/admin/invitations/:id/cancel
- POST /api/auth/accept-invite
- POST /api/admin/email/send-test

Frontend routes/pages:
- /accept-invite -> AcceptInvitePage
- /admin/users -> AdminUsersPage with active users, pending invitations, and expired invitations
- /admin/settings -> AdminSettingsPage with email configuration warning and Send test email action

Status: completed

### Phase 11 - Weekly Email Summary

Implement shared SMTP email sender, weekly summary service, manual test send, cron job, and logs.

Status: pending

### Phase 12 - Backups

Implement pg_dump backup job, backup logs, admin backup status, manual backup trigger, and restore docs.

Status: pending

### Phase 13 - Final Polish

Implement loading, empty, error, responsive states, production security review, README, line check, and final testing.

Status: pending

### Warehouse Phase W1 - Documentation And Rules

Define the warehouse integration direction, source-of-truth rules, P10A:1/FACK location rules, slot assignment rules, map-view rules, 3D pallet rules, and permission direction.

Acceptance:
- AGENTS.md records permanent warehouse integration rules.
- PLAN.md records the warehouse direction and phased implementation plan.
- The warehouse module is clearly defined as database-backed, not localStorage-backed.
- Warehouse slot assignments are defined as links to StockBalance rows.
- Location identity is defined as StorageLocation.code plus StockBalance.compartment/FACK.

Status: completed

### Warehouse Phase W2 - Database Foundation

Add Prisma models and migrations for:
- WarehouseLayout
- WarehouseObject
- WarehouseShelf
- WarehouseSlot
- WarehouseInventoryGroupLink
- WarehouseInventoryTableLink
- WarehouseSlotAssignment

Acceptance:
- Warehouse layouts can be represented in PostgreSQL.
- Shelves and slots are structured database rows.
- Slots can link to StorageLocation.
- Slot assignments can link to StockBalance.
- One slot can hold only one active assignment by default.
- Migrations apply cleanly in Docker.
- No non-schema source file exceeds 350 lines.

Status: completed

### Warehouse Phase W3 - Basic Warehouse API

Implement backend routes, controllers, services, repositories, and schemas for listing, creating, editing, and deleting warehouse layouts plus saving/loading layout JSON.

Status: completed

### Warehouse Phase W4 - Warehouse List And Save UI

Add Warehouses navigation and pages for listing, creating, renaming, opening, and deleting warehouse layouts.

Status: completed

### Warehouse Phase W5 - Integrate 3D Designer

Move the Future integration React/Babylon.js designer into the main client under client/src/modules/warehouse and replace localStorage persistence with backend API persistence.

Status: completed

### Warehouse Phase W6 - Shelf And Slot Generator

Implement P10A:1/FACK-style shelf and slot generation, including range generation, manual add, rename, and delete for empty shelves/slots.

Status: completed

### Warehouse Phase W6.5 - Link 3D Objects To Database Shelves

Read rack/shelf objects from the saved 3D designer layout, show them as source objects, and generate database WarehouseShelf/WarehouseSlot rows linked to the selected 3D WarehouseObject.

Acceptance:
- Saved 3D rack/shelf objects can be listed from WarehouseLayout.layoutData.
- User can generate P10A:1/FACK shelves from a selected 3D object.
- Generated WarehouseShelf rows store warehouseObjectId.
- WarehouseObject rows are persisted or updated from designer object geometry.
- The manual detached generator remains available for exceptional cases.
- No non-schema source file exceeds 350 lines.

Status: completed

### Warehouse Phase W6.6 - Physical Rack Slot Model Correction

Correct the warehouse model so a 3D pallet rack can have custom shelf levels, each shelf level can have custom EU-pallet-sized physical slots, and inventory location codes such as P10A:1 are mapped onto those slots.

Acceptance:
- WarehouseShelf can represent a physical rack shelf level.
- WarehouseSlot can represent one EU-pallet-sized physical slot.
- Rack slot generation accepts shelf level count and slots per shelf.
- Generated slots store P10A:1-style location codes for inventory matching.
- Slot compartment/FACK remains available for more precise matching.
- Generated slots stay linked to the selected 3D rack object.
- Existing manual location generator remains available.
- No non-schema source file exceeds 350 lines.

Status: completed

### Warehouse Phase W6.7 - Rack Slot Designer Preview

Replace blind rack slot generation with a focused rack setup workflow. The user selects a saved 3D pallet rack, chooses how many shelf levels it has, chooses how many EU-pallet slots each shelf level has, clicks individual slots, and assigns location IDs such as P10A:1 plus optional FACK.

Acceptance:
- Generate opens a focused rack slot designer instead of immediately creating final location IDs.
- Each rack level can have its own slot count.
- Each slot is visible before it is named.
- Empty slots can be saved as available physical positions.
- User-assigned slot IDs must use the P10A:1 location style.
- Internal placeholder values for unnamed slots must not be shown in the UI.
- Saved slots remain linked to the selected 3D rack object.
- Existing named slots prefill when reopening the same rack setup.
- No non-schema source file exceeds 350 lines.

Status: completed

### Warehouse Phase W7 - Shelf Map View

Create a 2D map view that shows shelves according to their saved warehouse positions and allows practical slot editing and assignment without entering 3D.

Status: completed

### Warehouse Phase W8 - Inventory Linking And Assignment

Allow warehouses to link to inventory groups/tables and assign StockBalance rows to warehouse slots with quantity and occupancy validation.

Status: completed

### Warehouse Phase W9 - 3D Pallet Placement And Focus

Render Euro pallets for active slot assignments, allow clicking pallets/slots to open inventory row details, and add View in warehouse from item details.

Status: pending

### Warehouse Phase W10 - Polish, Permissions, And Testing

Apply role permissions, loading/error states, responsive improvements, full verification, README updates, and final warehouse acceptance checks.

Status: pending

## Token Saving Rule

Before starting new work, read only:
- AGENTS.md
- PLAN.md
- relevant files for the current phase

Do not re-read the whole project unless necessary.

## Latest Completed Phase

Warehouse Phase W8 - Inventory Linking And Assignment (implemented together with W7).

## Phase Completion Log

### Warehouse Phase W1 - Documentation And Rules

Completed:
- Added permanent warehouse integration rules to AGENTS.md.
- Added warehouse integration direction to PLAN.md.
- Added a phased warehouse implementation plan from database foundation through 3D pallet placement and final polish.
- Defined the source-of-truth rule: warehouse placement links to StockBalance rows, not fake visual-only inventory records.
- Defined the location rule: use StorageLocation.code values such as P10A:1 and StockBalance.compartment/FACK values such as 1.
- Defined the shelf map rule: the map view and 3D view must share the same database shelves, slots, and assignments.
- Defined the 3D rule: Euro pallets appear only for active real slot assignments.

Verification:
- npm run check:lines passed.

### Warehouse Phase W2 - Database Foundation

Created:
- prisma/migrations/20260527090000_warehouse_foundation/migration.sql

Changed:
- prisma/schema.prisma

Completed:
- Added WarehouseLayout for saved database-backed warehouse layouts.
- Added WarehouseObject for persisted 3D designer objects and geometry.
- Added WarehouseShelf for P10A:1-style shelf/location records.
- Added WarehouseSlot for FACK/bin-level slots under shelves.
- Added WarehouseInventoryGroupLink so warehouses can attach to inventory groups.
- Added WarehouseInventoryTableLink so warehouses can attach to individual inventory tables.
- Added WarehouseSlotAssignment to link real StockBalance rows to warehouse slots.
- Added relations from User, StorageLocation, InventoryGroup, InventoryTable, InventoryItem, and StockBalance to the warehouse models.
- Added activeSlotKey as a nullable unique field to support one active assignment per warehouse slot by default.

Verification:
- npx prisma format --schema prisma/schema.prisma passed.
- npx prisma validate --schema prisma/schema.prisma passed.
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server rebuild passed.
- Docker migration deploy applied 20260527090000_warehouse_foundation successfully.
- Backend health returned database ok.
- PostgreSQL contains warehouse_layouts, warehouse_slots, and warehouse_slot_assignments.

Known issue:
- Host-side Prisma migrate currently does not work with the DATABASE_URL in the root .env. Docker migration deploy works because docker-compose.yml supplies the correct internal database URL. Fix the local .env DATABASE_URL before relying on npm run db:migrate from the host.

### Warehouse Phase W3 - Basic Warehouse API

Created:
- server/src/modules/warehouses/warehouse.routes.ts
- server/src/modules/warehouses/warehouse.controller.ts
- server/src/modules/warehouses/warehouse.service.ts
- server/src/modules/warehouses/warehouse.repository.ts
- server/src/modules/warehouses/warehouse.serializer.ts
- server/src/modules/warehouses/warehouse.schemas.ts

Changed:
- server/src/app.ts

Completed:
- Mounted authenticated warehouse APIs at /api/warehouses.
- Added warehouse list endpoint with active/archived/all filtering.
- Added warehouse create endpoint for admin, manager, and employee roles.
- Added warehouse details endpoint that returns saved layoutData.
- Added warehouse metadata update endpoint for name, description, and archive state.
- Added layout save endpoint at PUT /api/warehouses/:id/layout, incrementing layout version.
- Added DELETE /api/warehouses/:id as a soft archive operation for admin and manager roles.
- Added serializers with layout counts for objects, shelves, slots, links, and assignments.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server and client rebuild passed.
- Backend health returned database ok.
- /warehouses and /warehouses/test-id returned HTTP 200 from the Docker client.

Known issue:
- npm audit reports high-severity advisories in the required xlsx package and currently reports no fix available. Keep workbook upload access role-protected and continue validating imports server-side.
- Docker server rebuild passed.
- Backend health returned database ok.
- Unauthenticated GET /api/warehouses returned 401.
- Authenticated smoke test passed: create warehouse, save layout JSON, archive warehouse, and clean temporary data.
- Verified no temporary W3 smoke-test users or warehouse layouts remain in PostgreSQL.

### Warehouse Phase W4 - Warehouse List And Save UI

Created:
- client/src/types/warehouse.ts
- client/src/services/warehouse.service.ts
- client/src/hooks/useWarehouses.ts
- client/src/components/warehouses/WarehouseCreatePanel.tsx
- client/src/components/warehouses/WarehouseCard.tsx
- client/src/components/warehouses/WarehouseArchiveControls.tsx
- client/src/components/warehouses/WarehouseDetailsPanel.tsx
- client/src/pages/WarehousesPage.tsx
- client/src/pages/WarehouseDetailsPage.tsx

Changed:
- client/src/app/router.tsx
- client/src/components/layout/Sidebar.tsx
- client/src/components/layout/Topbar.tsx

Completed:
- Added Warehouses navigation in desktop and mobile app shells.
- Added /warehouses overview page with create workflow.
- Added current, archived, and all warehouse filters.
- Added warehouse cards with object, shelf, slot, and assignment counts.
- Added /warehouses/:id details page.
- Added warehouse metadata editing for name and description.
- Added a temporary JSON layout editor and save action until the full 3D designer is integrated.
- Added archive and restore actions wired to backend permissions.
- Connected the warehouse UI to the /api/warehouses backend.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server and client rebuild passed.
- Backend health returned database ok.
- /warehouses returned HTTP 200 from the Docker client.
- Unauthenticated GET /api/warehouses returned 401.

### Warehouse Phase W5 - Integrate 3D Designer

Created:
- client/src/modules/warehouse-designer/
- client/src/components/warehouses/WarehouseDesignerPanel.tsx

Changed:
- client/package.json
- package-lock.json
- client/src/pages/WarehouseDetailsPage.tsx
- client/src/components/warehouses/WarehouseDetailsPanel.tsx
- client/src/modules/warehouse-designer/App.tsx
- client/src/modules/warehouse-designer/components/TopBar.tsx
- client/src/modules/warehouse-designer/store/useStudioStore.ts
- client/src/modules/warehouse-designer/store/defaults.ts
- client/src/modules/warehouse-designer/styles/chunk-01.css
- client/src/modules/warehouse-designer/styles/chunk-05.css

Removed:
- client/src/modules/warehouse-designer/main.tsx
- client/src/modules/warehouse-designer/components/Phase6Panel.tsx
- client/src/modules/warehouse-designer/utils/projectVault.ts

Completed:
- Moved the Future integration warehouse designer into the main React client.
- Added Babylon.js and Zustand dependencies to the client workspace.
- Replaced the temporary warehouse JSON editor with the embedded 3D/plan designer.
- Added a Save button inside the designer top bar.
- Save writes the exported designer project to WarehouseLayout.layoutData through /api/warehouses/:id/layout.
- Removed the designer's automatic localStorage persistence and old local snapshot vault.
- Loaded existing WarehouseLayout.layoutData into the designer when opening /warehouses/:id.
- Added a database-backed starter project when a warehouse has no valid saved designer data.
- Code-split the heavy designer module so Babylon loads only on warehouse detail pages.
- Scoped the designer body/background styles to the embedded designer shell so they do not take over the whole app.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.

### Warehouse Phase W6 - Shelf And Slot Generator

Created:
- server/src/modules/warehouses/warehouse-location-utils.ts
- server/src/modules/warehouses/warehouse-slots.controller.ts
- server/src/modules/warehouses/warehouse-slots.repository.ts
- server/src/modules/warehouses/warehouse-slots.serializer.ts
- server/src/modules/warehouses/warehouse-slots.service.ts
- client/src/hooks/useWarehouseShelves.ts
- client/src/components/warehouses/WarehouseShelfGenerator.tsx
- client/src/components/warehouses/WarehouseShelfCreateForm.tsx
- client/src/components/warehouses/WarehouseShelfList.tsx
- client/src/components/warehouses/WarehouseShelvesPanel.tsx

Changed:
- server/src/modules/warehouses/warehouse.routes.ts
- server/src/modules/warehouses/warehouse.schemas.ts
- client/src/types/warehouse.ts
- client/src/services/warehouse.service.ts
- client/src/pages/WarehouseDetailsPage.tsx

Completed:
- Added warehouse shelf and FACK slot API endpoints under /api/warehouses/:id.
- Added P10A:1-style shelf validation and normalization.
- Added range generation such as P10A:1 through P10A:8 with FACK 1 through FACK 4.
- Generator creates or reuses matching StorageLocation records.
- WarehouseShelf rows link to StorageLocation rows.
- WarehouseSlot rows link to the same StorageLocation and keep FACK as compartment.
- Added manual shelf creation with optional FACK list.
- Added manual slot creation for an existing shelf.
- Added shelf rename/display-name update.
- Added slot rename/update.
- Added delete protections so occupied shelves or slots cannot be removed.
- Added a warehouse detail panel showing shelf, slot, and assignment counts.
- Added UI controls for Generate range and Add shelf.
- Added shelf cards with editable FACK slot chips and icon-only delete buttons with confirmation.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server and client rebuild passed.
- Backend health returned database ok.
- /warehouses/test-id returned HTTP 200 from the Docker client.
- Unauthenticated GET /api/warehouses/test-id/shelves returned 401.
- Authenticated Docker smoke test passed: created a temporary warehouse, generated 2 shelves and 4 FACK slots, listed shelves, and cleaned the temporary warehouse/user rows.

### Warehouse Phase W6.5 - Link 3D Objects To Database Shelves

Created:
- server/src/modules/warehouses/warehouse-scene-objects.ts
- server/src/modules/warehouses/warehouse-scene.repository.ts
- server/src/modules/warehouses/warehouse-scene.service.ts
- server/src/modules/warehouses/warehouse-scene.controller.ts
- client/src/hooks/useWarehouseSceneObjects.ts
- client/src/components/warehouses/WarehouseSceneObjectsPanel.tsx

Changed:
- AGENTS.md
- PLAN.md
- server/src/modules/warehouses/warehouse.routes.ts
- server/src/modules/warehouses/warehouse.schemas.ts
- server/src/modules/warehouses/warehouse-slots.repository.ts
- server/src/modules/warehouses/warehouse-slots.serializer.ts
- server/src/modules/warehouses/warehouse-slots.service.ts
- client/src/types/warehouse.ts
- client/src/services/warehouse.service.ts
- client/src/components/warehouses/WarehouseShelvesPanel.tsx

Completed:
- Added permanent rules that database shelves should preferably be generated from saved 3D rack/shelf objects.
- Added scene-object extraction from WarehouseLayout.layoutData.
- Added GET /api/warehouses/:id/scene-objects for saved pallet-rack and storage-shelf objects.
- Added POST /api/warehouses/:id/scene-objects/generate-shelves.
- Persisted selected scene objects into WarehouseObject with position, rotation, size, type, and metadata.
- Generated WarehouseShelf rows with warehouseObjectId linked to the persisted WarehouseObject.
- Kept StorageLocation.code and WarehouseSlot.compartment as the inventory location identity.
- Added UI showing saved 3D shelf sources and linked shelf counts.
- Added Generate action from a selected 3D object while keeping the manual generator available.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server and client rebuild passed.
- Backend health returned database ok.
- /warehouses/test-id returned HTTP 200 from the Docker client.
- Unauthenticated GET /api/warehouses/test-id/scene-objects returned 401.
- Authenticated Docker smoke test passed: created a temporary warehouse with a saved 3D rack object, listed 1 scene object, generated 1 linked WarehouseObject, 1 linked shelf, and 2 FACK slots, then cleaned the temporary rows.

### Warehouse Phase W6.6 - Physical Rack Slot Model Correction

Created:
- prisma/migrations/20260527160000_physical_rack_slots/migration.sql

Changed:
- AGENTS.md
- PLAN.md
- prisma/schema.prisma
- server/src/modules/warehouses/warehouse.routes.ts
- server/src/modules/warehouses/warehouse.schemas.ts
- server/src/modules/warehouses/warehouse-scene.controller.ts
- server/src/modules/warehouses/warehouse-scene.service.ts
- server/src/modules/warehouses/warehouse-slots.serializer.ts
- server/src/modules/warehouses/warehouse-slots.service.ts
- client/src/types/warehouse.ts
- client/src/services/warehouse.service.ts
- client/src/hooks/useWarehouseSceneObjects.ts
- client/src/components/warehouses/WarehouseSceneObjectsPanel.tsx
- client/src/components/warehouses/WarehouseShelfList.tsx

Completed:
- Corrected the model direction so WarehouseShelf can represent a physical rack shelf level.
- Corrected WarehouseSlot so it can represent one EU-pallet-sized physical slot.
- Added shelfKind and levelNumber to WarehouseShelf.
- Added slotIndex, palletWidth, and palletDepth to WarehouseSlot.
- Added POST /api/warehouses/:id/scene-objects/generate-rack-slots.
- Rack generation now accepts shelf level count, slots per shelf, pallet dimensions, start location, and FACK.
- Generated rack levels stay linked to the selected 3D WarehouseObject.
- Generated pallet slots receive sequential P10A:1-style location codes for inventory matching.
- Kept the older manual location generator available for exceptional cases.
- Updated the UI to ask for shelf levels and slots per level instead of treating location codes as shelf levels.

Verification:
- npx prisma format passed.
- npx prisma validate passed.
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server and client rebuild passed and migration deploy ran through container startup.
- Backend health returned database ok.
- /warehouses/test-id returned HTTP 200 from the Docker client.
- Unauthenticated GET /api/warehouses/test-id/scene-objects returned 401.
- Authenticated Docker smoke test passed: one saved rack object generated 3 physical shelf levels, 6 pallet slots, linked all shelf levels to the 3D object, and assigned location codes starting at P999Z:1.

### Post Phase 8 Guardrail and Location Design Adjustment

Completed:
- Schema files, AGENTS.md, and PLAN.md are exempt from the 350-line guardrail.
- Verktygsrum now maps PLAN/HYLLA/BACK to Location.rawLabel/shelf and FACK to Location.compartment.
- Confirm import can repair the older "shelf / compartment" location shape on next import.

Design note:
- Belaggning vrum is shelf-level map data; Phase 9 should group shelf map positions and tool compartments by shared shelf/rawLabel.

### Phase 0

Created project docs, env example, root scripts, gitignore, and line guard.

### Phase 1

Created Docker Compose, backup scripts/folders, Prisma foundation, Express health endpoint, and React/Vite/Tailwind foundation. Verified Docker PostgreSQL, migration, seed, health, and frontend HTTP 200.

### Phase 2

Added required Prisma models, role/status enums, full domain migration, non-unique Tool.articleNumber, bcrypt admin seed, OKUMA/HAAS seed, and baseline settings.

### Phase 3

Added layered auth backend, httpOnly sessions, hashed session tokens, bcrypt verification, logout, /api/auth/me, auth/role middleware, frontend auth provider, login page, and protected dashboard.

### Phase 4

Completed:
- Tool create, read, update, list, search, filters, sorting, pagination, archive, restore, and soft delete.
- ToolHistory logging for create, update, archive, restore, and delete.
- Metadata listing/creation for tool types, manufacturers, locations, and machines.
- Authenticated reads and admin/manager mutations; DELETE is admin-only and soft-delete only.

Verification:
- Build, lint, line check, Docker rebuild, health, auth rejection, validation rejection, and full API workflow passed.
- Temporary Phase 4 verification records were removed from the dev database.

### Phase 5

Completed:
- Admin-only dashboard metrics for tools, types, manufacturers, locations, low stock, weekly updates, and issue-state tools.
- Operational status panel for latest import, backup, and weekly email records.
- Premium dark app shell with protected dashboard route.

Verification:
- Build, lint, line check, Docker rebuild, admin dashboard API, unauthenticated rejection, /dashboard HTTP 200, and container status passed.

### Phase 6

Added:
- client tools services, metadata service, tool/metadata types, hooks, constants, and format utilities
- client tools toolbar, table, pagination, add/edit modal, and details drawer
- /tools route and desktop/mobile navigation entry

Completed:
- Search, filters, archived segment, sort controls, pagination, role-aware add/edit/archive/restore/delete actions, details drawer, and empty/loading/error states.
- Add/edit form supports product, article number, manufacturer, type, location, machine, quantity, status, and notes.
- Status editing excludes ARCHIVED so archive state stays controlled by archive/restore actions.

Verification:
- Build, lint, line check, Docker rebuild, /tools HTTP 200, authenticated tools API, metadata API, and container status passed.

Excel workbook:
- Found ../VERKTYGSRUM.xlsx.
- Do not seed directly from Excel; use Phase 7 preview and Phase 8 confirm import.

### Phase 7

Completed:
- Added Excel preview backend/frontend modules and sheet-specific mappers for Verktygsrum and Belaggning vrum.
- Admin-only preview preserves rawData, ignores Blad1, warns on unknown sheets, detects likely duplicates, and shows /import.
- Malformed JSON requests return 400 instead of a generic 500.

Verification:
- Build, lint, line check, Docker rebuild, health, /import, unauthenticated rejection, malformed JSON, and real workbook preview passed.
- Workbook preview returned 607 tools, 1057 locations, 0 issues, and 13 likely duplicates.

### Phase 8

Completed:
- Added confirmed import persistence, import repositories/logs, Excel export, confirm UI, and Tools export action.
- Confirm import re-parses uploaded workbooks server-side and saves tools, locations, slots, manufacturers, tool types, and machines.
- ImportBatch/ImportRowIssue logging, source row idempotency, duplicate-row preservation, slot linking, and XLSX export are implemented.

Verification:
- Build, lint, line check, Docker rebuild, import confirm, export, unauthenticated export rejection, health, /tools, and /import passed.
- Database after real import: 607 tools, 1054 locations, and 4 machines; re-confirm creates 0 tools and updates 607.

### Phase 9

Completed:
- Machines page with imported machine cards and slot counts.
- Machine detail page showing real database inventory items for imported machine names.
- Locations page with searchable PLAN/HYLLA/BACK and FACK rows.
- Location map page grouping Belaggning vrum shelf map cells with Verktygsrum FACK compartments by shared shelf/rawLabel.
- Desktop and mobile navigation entries for Machines and Locations.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker client rebuild passed.
- /machines, /machines/:id, /locations, and /locations/map returned 200.
- API data verified: 4 machines, 1054 locations, 611 mapped shelf locations, and 442 compartment locations.

Known issues:
- Location map is data-grid based; a more spatial visual layout can be refined later if the shelf-map workflow needs exact Excel-like positioning.

### Phase 10

Added:
- SMTP email module using free-capable SMTP configuration.
- Admin invitation, resend, cancel, user role/status, settings, and test-email APIs.
- Auth accept-invite endpoint with hashed, expiring, single-use invitation tokens.
- AcceptInvitePage, AdminUsersPage, AdminSettingsPage, admin route guard, and admin navigation.
- Admin user/invitation services, hooks, types, and components.

Completed:
- Roles are exactly admin, manager, employee, and viewer.
- Admins invite users by email instead of creating passwords.
- Admin Settings can edit SMTP configuration and save it to the database.
- SMTP passwords saved through Admin Settings are encrypted at rest.
- Users now have database profiles with first name, last name, phone, profile picture URL, and email from User.
- Tool details drawer is grouped by business meaning and hides repetitive raw/import fields by default.
- Machine management now supports adding and removing machines from the UI.
- Removing a machine unassigns inventory tools without deleting tool inventory.
- Machine details show only database inventory items in the machine.
- M02-1 and M04-2 were removed from the current database; other existing machines remain.
- Invitation raw tokens are only used for email links and are never returned by API responses.
- Pending invitations remain available for resend if SMTP is missing or sending fails.
- Admin settings shows SMTP status and the exact not-configured warning.
- Admin can send a test email, update weekly summary recipient, deactivate/reactivate users, and change roles.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- npm audit --omit=dev reports the required xlsx package has high advisories with no direct npm fix.

Known issues:
- SMTP must be configured before invitations or weekly summaries can actually send.
- The xlsx advisories are mitigated for now by admin-only import, memory upload limits, and no workbook execution; reassess if a maintained compatible parser is approved.

### Inventory Placement Refinement

Completed:
- Added placement filtering for all tools: all, in storage, in machine, and unassigned.
- Added backend placement actions to move tools between location, machine, new location, and unassigned states.
- Added a shared placement panel in tool details so storage/machine reassignment works from tools, machines, and locations workflows.
- Added location occupancy status so locations show occupied/free based on attached tools.
- Added an unassigned tools section on LocationsPage.
- Machine placement works through real Tool rows, not raw imported machine rows.
- Excel confirm now avoids persisting malformed storage labels as normal locations.
- Existing malformed dev database locations were cleaned: 63 invalid location records deleted, 0 tools unassigned.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Health endpoint returned database ok.
- /locations and /machines returned HTTP 200.

Known issues:
- Authenticated placement API smoke testing could not use the current .env admin credentials because the login request returned 401; UI and backend compile/build verification passed.

### Machine Inventory Quantity Workflow

Completed:
- Removed raw imported machine-row data from the normal MachineDetailsPage.
- MachineDetailsPage now shows one database-backed inventory table with the same column structure as the Tools table.
- Added Add item workflow on machine details to search existing Tool records and move a chosen quantity into the machine.
- Added POST /api/machines/:id/tools/link for admin/manager machine transfers.
- Machine transfers decrement the source Tool quantity and create or increase the matching machine Tool row.
- Tool details in the main Tools page can move a chosen quantity to a selected machine instead of blindly changing placement.
- Machine cards now show only real database items in each machine.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.

Known issues:
- Returning quantity from a machine back into a matching storage row is still handled by the older placement move and should be refined into a symmetrical quantity-return workflow.

### Raw Machine Row Removal

Completed:
- Dropped the machine_tool_slots database table with migration 20260525082000_remove_machine_tool_slots.
- Removed the MachineToolSlot Prisma model and Tool/Machine relations.
- Removed raw machine-row counts from machine cards and admin dashboard metrics.
- Removed the machine slot endpoint from metadata routes.
- Removed the old raw machine-row confirmation endpoint from tool routes.
- Removed the old machine slot UI components.
- Excel preview/import now ignores OKUMA and HAAS raw machine rows instead of storing them.
- Excel export no longer creates a Machine Slots sheet.
- Real Tool inventory rows were kept unchanged.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Migration applied successfully in Docker.
- PostgreSQL to_regclass('public.machine_tool_slots') returns null.
- Backend health returned database ok.
- /machines returned HTTP 200.

### Dynamic Inventory Platform Start

Completed:
- Added DynamicInventory, DynamicInventoryColumn, DynamicInventoryRow, UsedInCard, and UsedInAssignment Prisma models.
- Added migration 20260525090000_dynamic_inventories.
- Added generic Excel preview/import endpoints under /api/inventories.
- Generic import reads every non-empty sheet, preserves Excel column names, and creates named inventory tables.
- Added Inventory page listing imported inventories.
- Added Inventory detail page that renders imported rows with the original sheet columns.
- Added Used In pages for creating cards and viewing assigned inventory rows.
- Inventory rows can be assigned to Used In cards.
- Used In detail groups assigned rows by original inventory and renders each group with its own columns.
- Sidebar/topbar now show Inventory and Used In as the primary workflow.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Migration applied successfully in Docker.
- dynamic_inventories and used_in_cards tables exist.
- Backend health returned database ok.
- /inventory, /used-in, and /import returned HTTP 200.

Known limitations:
- The older fixed Tools/Machines/Locations routes still exist during transition.
- Dynamic import stores sheet rows in JSON-backed dynamic tables, not physical Prisma models per Excel sheet.
- Dynamic inventory row search/filter/sort and column type editing are not implemented yet.
- Assignment quantity movement between dynamic inventories and Used In cards is not implemented yet.

### Structured Assisted Import Refactor

Completed:
- Added the structured inventory Prisma models to schema.prisma:
  Manufacturer.normalizedName, ToolCategory, InventoryItem, ItemIdentifier, ItemAttribute, StorageLocation, LocationAlias, StockBalance, StockMovement, InventoryGroup, InventoryTable, ImportProfile, StructuredImportBatch, StructuredImportSheet, ImportColumnMapping, and ImportStagingRow.
- Applied structured inventory migrations to the Docker PostgreSQL database.
- Mounted structured import APIs at /api/imports, with compatibility at /api/structured-imports.
- Mounted structured inventory APIs at /api/structured-inventory.
- Replaced the blind dynamic import page with an assisted wizard:
  upload, sheet selection, grouping/target mode, column mapping, staging preview, warning fixes, confirm, and result.
- Mapping UI shows Excel headers, sample values, suggested target, confidence, target dropdown, and attribute details.
- Staging rows are saved before final import and can be marked ready, unassigned, ignored, or fixed with the suggested previous location.
- Confirmed import writes manufacturers, categories, items, identifiers, attributes, storage locations, stock balances, stock movements, inventory groups/tables, and import profiles.
- Inventory page now shows structured InventoryGroup and InventoryTable records instead of dynamic JSON tables.
- /inventory/groups/:id and /inventory/tables/:id are active structured inventory views.

Verification:
- npm run build passed.
- npm run lint passed.
- npm run check:lines passed.
- PostgreSQL contains the structured import and stock tables.

Known limitations:
- Manual header row override is stored, but changing it does not yet re-parse the workbook because uploaded workbook bytes are not persisted.
- Merge-compatible-sheet validation is basic; merge target mode shares one logical table but does not yet compare column compatibility.
- Formula total mismatch warnings are not implemented yet.
- DynamicInventory tables remain in the codebase as a legacy fallback but are no longer the main import workflow.

### Structured Inventory Usability Refinement

Completed:
- Fixed import preview so deselected sheets no longer appear in staging rows and no longer block confirmation.
- Structured staging counts now reflect selected/importable sheets instead of the whole workbook.
- Simplified the column mapping page with selected-sheet, mapped-column, and ignored-column summaries.
- Mapping rows now show sample values plus the suggested system target in clearer text.
- Added manual inventory group creation from the Inventory page.
- Added standalone manual inventory table creation from the Inventory page.
- Added table creation inside an existing inventory group.
- Added manual stock row creation inside an inventory table.
- Manual stock rows support item name, article, alternative article, manufacturer, category, grade, quantity, unit, unit price, compartment, and placement.
- Added placement types for manual stock rows:
  - Storage location
  - Used in
  - Location in
- Structured inventory table rows now display placement with Used in / Location in labels.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Health endpoint returned database ok.
- /import and /inventory returned HTTP 200.

Known limitations:
- The manual add form supports core item/stock fields, but not arbitrary technical attributes yet.
- Used in and Location in are currently placement/location types, not separate relationship modules.

### Import Staging Null Handling Fix

Completed:
- Empty mapped Excel cells are now stored as null in mapped staging data.
- Missing location no longer creates a needs_review row; it imports as unassigned stock unless the user maps a location.
- Invalid non-empty quantity values still require review.
- Staging preview no longer limits selected rows to 500, preventing hidden unresolved rows from blocking confirmation.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Health endpoint returned database ok.
- /import returned HTTP 200.

### Import Identity Matching Fix

Completed:
- Fixed structured import item matching so rows with article identifiers are not merged by product name and manufacturer alone.
- If an Excel row has ART.NR or ALT.ART.NR and no exact identifier match exists, the importer now creates a separate InventoryItem.
- Product/manufacturer fallback matching now only applies when the row has no identifiers.

Reason:
- The previous logic merged different insert rows such as many "Skär / Sandvik" articles into one InventoryItem, which made 607 imported staging rows appear as only 494 stock rows.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Health endpoint returned database ok.

Known data note:
- Imports made before this fix may already contain merged items. Clean and re-import those structured inventory records to rebuild them with the corrected identity logic.

### Structured Inventory Entry Settings and No-Merge Import Refinement

Completed:
- Removed global uniqueness from ItemIdentifier type + normalizedValue so duplicate article numbers do not collapse rows.
- Removed StockBalance uniqueness by table/item/location/compartment so inventory table entries can remain separate.
- Structured import now creates a new InventoryItem and StockBalance for every ready staging row.
- Import staging now marks possible duplicates in mappedData instead of merging them automatically.
- Staging preview shows duplicate indicators with Verify and Dismiss actions.
- Added InventoryTable.columnSettings for per-table visible-column configuration.
- Added InventoryItem.imageUrl and qrCodeId.
- Added StockBalance.publicId, status, notes, archivedAt, and archivedByUserId for table-specific entry behavior.
- Added backend routes for table column settings, table/group removal, row detail, row edit, row archive/restore, and row removal.
- Inventory table UI now lets users choose visible columns; hidden fields remain available when opening the item.
- Inventory rows can be opened in a detail drawer, edited, saved, archived/restored, removed, and shown with attributes, notes, picture URL, and QR code.
- Manual stock row creation now supports notes and picture URL.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Migration 20260526120000_inventory_entry_settings_and_no_merge applied successfully in Docker.
- Health endpoint returned database ok.

Known data note:
- Existing imports created before the no-merge migration may still contain previously merged rows. Re-import after cleaning those structured inventory records to rebuild one inventory entry per Excel row.

### Uploaded QR Code Image Correction

Completed:
- Removed the generated QR code display from the inventory row detail drawer.
- Added InventoryItem.qrCodeImageUrl for user-uploaded QR code images.
- Added authenticated image upload endpoint at POST /api/uploads/images.
- Uploaded images are stored under UPLOAD_DIR and exposed from /uploads.
- Docker Compose now mounts ./uploads to /app/uploads so uploaded files persist.
- Inventory row detail drawer now lets the user upload and preview a QR code image.
- Manual stock row creation also supports saving a QR code image URL.
- Removed the qrcode.react dependency.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.

### Item Picture Upload Correction

Completed:
- Added an Upload item picture control to the inventory row detail drawer.
- Item pictures use the same authenticated local image upload endpoint as QR code images.
- The uploaded item picture URL is saved in InventoryItem.imageUrl when the user clicks Save edit.

### Hidden Image URL UI Cleanup

Completed:
- Removed visible picture URL and QR code image URL fields from the add-item and item-detail interfaces.
- Added shared upload controls for item pictures and QR code images.
- Stored image paths remain internal database values and are not shown as editable URL fields to normal users.

### Internal Row Status UI Cleanup

Completed:
- Removed Status from configurable table columns.
- Removed Active rows / Archived rows / All rows wording from the user-facing filter.
- Kept archive state internal and exposed it only through the Archived view button and row archive/restore actions.

### Structured Take, Use In, and Return Movement Workflow

Completed:
- Added UsedInSpot, UsedInStockAssignment, and TakenStockItem database models.
- Added stock movement APIs for taking a structured inventory row, assigning it to a Used In card, listing taken items, and returning taken or used items.
- Taking stock decreases the source StockBalance quantity and creates a TakenStockItem shown in a separate Taken Items view.
- Using stock in a card decreases the source StockBalance quantity and creates UsedInStockAssignment records.
- Used In cards can be created with optional named spots.
- If a card has spots, each used unit must be assigned to one empty spot; each spot can hold only one active item.
- If a card has no spots, stock can be assigned directly to the card.
- Returning taken or used stock increases the original StockBalance quantity and marks the movement returned.
- Inventory table rows now show usage tags such as "2 used in Card A" beside the source item.
- Used In card details group structured assignments by the original InventoryTable and render each group using that table's column settings.
- Added a Taken Items navigation page with return actions.

Verification:
- npm --workspace server run prisma:generate passed.
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Migration 20260526150000_structured_take_and_used_in applied successfully in Docker.
- Health endpoint returned database ok.
- Frontend returned HTTP 200.

### Structured Inventory Table UX, Custom Columns, and Widgets

Completed:
- Replaced the always-visible Add item form with an Add item drawer opened from the table header.
- Added user-defined additional columns to manual add/edit flows.
- Additional columns are saved as ItemAttribute records in PostgreSQL.
- Table column settings now support custom attribute columns stored in InventoryTable.columnSettings.
- Newly added custom attribute columns are automatically registered in the table settings and made visible.
- Table column settings now support editing display labels for built-in and custom columns.
- Built-in columns can be hidden from a table with a trash-icon action without deleting core data.
- Custom columns can be deleted from a table; deleting them also removes their matching ItemAttribute values from rows in that table.
- Redesigned the table layout settings panel into a compact two-panel layout with dense column cards and grouped widget controls.
- Table layout settings are hidden behind a Table layout button so the table page stays focused.
- Structured inventory tables now have explicit Current / Archived / All controls, so users can return from archived view.
- Added per-table widget settings for Different items, Inventory balance, and Inventory manager.
- Inventory manager name is saved in the table settings and shown only if the manager widget is enabled.
- The item-count widget counts inventory table rows, not grouped product names and not summed quantity.
- Added text search plus item-name and manufacturer dropdown filters.
- Remove actions in the structured inventory surfaces now use trash-icon buttons and confirmation prompts.
- Taken Items and Used In structured tables now respect custom table columns.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.

### Item Detail Read-Only Mode

Completed:
- Inventory row details now open in read-only mode.
- Item fields, notes, images, QR image, and additional columns render as detail widgets/cards.
- Editing controls, upload controls, and additional-column inputs appear only after pressing Edit.
- Save/Cancel actions are only visible in edit mode.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.

### Used In Card Management Redesign

Completed:
- Replaced the inline Used In card creation form with a New card drawer.
- Replaced textarea-based spot creation with structured spot rows that can be added, renamed, and removed.
- Added bulk spot generation by prefix and count, for example prefix T and count 19 creates T1 through T19.
- Added card rename/edit support through PATCH /api/used-in/cards/:id.
- Added safe card delete support through DELETE /api/used-in/cards/:id.
- Deleting a card is blocked when it still has assigned items.
- Deleting an occupied spot is blocked; items must be returned first.
- Usage card cards now show active assigned count and spot occupancy.
- Usage card detail pages now show all named spots, including empty spots.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.

### Inventory Pagination and Duplicate Review

Completed:
- Added inventory table pagination controls so tables with hundreds of rows can move between pages.
- Structured inventory row loading now preserves page, search, archive mode, and dropdown filters.
- Added table-specific possible duplicate summary to inventory tables.
- Added duplicate review drawer that shows duplicate groups with all important base fields and every item attribute column.
- Added explicit duplicate merge action with a selectable primary row.
- Merge archives secondary duplicate rows and moves their quantity into the primary row instead of silently deleting records.
- Merge is blocked when duplicate rows have active taken/used assignments.

Backend routes:
- GET /api/structured-inventory/tables/:id/duplicates
- POST /api/structured-inventory/tables/:id/duplicates/merge

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.

### Structured Inventory Table Search Filters

Completed:
- Added table-specific item attribute filter options based on the actual attributes stored in rows for that table.
- Added an expandable Attribute filters panel with dropdowns for attribute name and attribute value.
- Search now supports text, item dropdown, manufacturer dropdown, and multiple exact attribute filters.
- Backend row queries now accept categoryName and attributeFilters and apply them directly in Prisma.
- Backend filter options now return item names, manufacturers, types, and attribute/value lists.
- The Type dropdown was removed from the visible search bar per user preference; backend support remains available.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- Docker server/client rebuild passed.
- Backend health returned database ok.
- /inventory returned HTTP 200.

### Warehouse Phase W6.7 - Rack Slot Designer Preview

Created:
- server/src/modules/warehouses/warehouse-rack-layout.service.ts
- client/src/components/warehouses/WarehouseRackSlotDesigner.tsx

Changed:
- AGENTS.md
- PLAN.md
- server/src/modules/warehouses/warehouse.routes.ts
- server/src/modules/warehouses/warehouse-scene.controller.ts
- server/src/modules/warehouses/warehouse.schemas.ts
- server/src/modules/warehouses/warehouse-slots.serializer.ts
- client/src/components/warehouses/WarehouseSceneObjectsPanel.tsx
- client/src/components/warehouses/WarehouseShelfList.tsx
- client/src/components/warehouses/WarehouseShelvesPanel.tsx
- client/src/hooks/useWarehouseSceneObjects.ts
- client/src/services/warehouse.service.ts
- client/src/types/warehouse.ts

Completed:
- Added POST /api/warehouses/:id/scene-objects/rack-slot-layout.
- Added a focused rack slot designer for saved 3D rack objects.
- User can set shelf level count and per-level EU-pallet slot counts.
- User can click each physical slot and assign a P10A:1-style location ID plus FACK.
- Empty slots are saved as available physical positions without showing internal placeholder codes.
- Existing named rack slots prefill when reopening the same rack setup.
- Duplicate location/FACK combinations are blocked before save.
- Rack level and slot rows remain linked to the selected 3D WarehouseObject.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.

### Warehouse Phase W7 + W8 - Shelf Map View and Inventory Linking

Created:
- server/src/modules/warehouses/warehouse-links.repository.ts
- server/src/modules/warehouses/warehouse-links.service.ts
- server/src/modules/warehouses/warehouse-links.controller.ts
- server/src/modules/warehouses/warehouse-assignments.repository.ts
- server/src/modules/warehouses/warehouse-assignments.serializer.ts
- server/src/modules/warehouses/warehouse-assignments.service.ts
- server/src/modules/warehouses/warehouse-assignments.controller.ts
- client/src/hooks/useWarehouseLinks.ts
- client/src/hooks/useWarehouseSlotAssign.ts
- client/src/components/warehouses/WarehouseInventoryLinksPanel.tsx
- client/src/components/warehouses/WarehouseSlotCard.tsx
- client/src/components/warehouses/WarehouseSlotAssignPanel.tsx
- client/src/components/warehouses/WarehouseSlotMapPanel.tsx

Changed:
- PLAN.md
- scripts/check-file-lines.mjs (added Claude.md to ignoredFiles)
- server/src/modules/warehouses/warehouse.schemas.ts (added assignment/link schemas)
- server/src/modules/warehouses/warehouse.routes.ts (added assignment/link routes)
- client/src/types/warehouse.ts (added assignment/link types)
- client/src/services/warehouse.service.ts (added assignment/link API functions)
- client/src/pages/WarehouseDetailsPage.tsx (added Shelves/Map/Linked Inventory tabs)
- client/src/components/structured-inventory/StockRowDetailsDrawer.tsx (added warehouse placement card)

Completed:
- Added warehouse inventory links backend: link/unlink InventoryGroup and InventoryTable records to a warehouse.
- Added GET /api/warehouses/:id/links and GET /api/warehouses/:id/links/available.
- Added POST/DELETE for group and table links under /api/warehouses/:id/links/groups and /api/warehouses/:id/links/tables.
- Added warehouse slot assignment backend: assign and unassign StockBalance rows to warehouse slots.
- Added GET /api/warehouses/:id/assignments listing all active slot assignments for a warehouse.
- Added GET /api/warehouses/:id/slots/:slotId/assignments listing active assignments for one slot.
- Added GET /api/assignment/by-stock/:stockBalanceId for looking up a stock row's current warehouse placement.
- Added POST /:id/slots/:slotId/assign and DELETE /:id/assignments/:assignmentId.
- Assignment validation checks slot exists, belongs to warehouse, is active, not at capacity, and stock not already assigned.
- activeSlotKey unique constraint enforces one active assignment per slot; set to slotId on assign, null on unassign.
- Added 2D shelf map panel showing all shelves and their slots with occupied/free state.
- Slot cards display the assigned item name with green/grey visual state.
- Clicking a slot opens the slot assignment panel where current assignments can be viewed and unassigned.
- Slot assignment panel lets users search assignable inventory rows by item name, manufacturer, or location code.
- Added Linked Inventory panel for linking/unlinking InventoryGroup and InventoryTable records to a warehouse.
- Warehouse details page now has three tabs: Shelves, Slot map, and Linked inventory.
- Inventory row details drawer now shows warehouse placement when the row is assigned to a warehouse slot.
- Warehouse placement card shows slot code, compartment, shelf, and warehouse name with a View in warehouse link.
- Fixed: import { Map as MapIcon } from "lucide-react" to avoid shadowing global Map constructor.

Verification:
- npm run lint passed.
- npm run build passed.
- npm run check:lines passed.
- docker compose up -d --build server client passed.
- Backend health returned database ok.
- Client returned HTTP 200 on port 5173.

## QR Scan Workflow - Completed

Completed:
- Added a dashboard Scan QR action for authenticated users.
- Added camera-based QR scanning with manual QR value fallback.
- Added backend QR lookup endpoint for stock rows by hidden item QR value, item id, uploaded QR image URL, or item identifiers.
- Scan result card shows matched item picture, table, quantity, location/FACK, warehouse placement, managers, and used-in state.
- Scan result card supports Take me there, Take out / Use in, Add note, and Report urgent issue for permitted roles.
- Take me there routes to the source inventory table and highlights the matched row.
- Uploaded QR code images remain user-facing images only; URL fields stay hidden from users.
- QR image uploads now decode the QR payload and store it as hidden item data for future scans.
- New image uploads are stored as database-backed data URLs so Render restarts do not break item, QR, or profile images.

Verification:
- npm run check:lines passed.
- npm run lint passed.
- npm run build passed.

## Known Risks

- Excel columns vary between sheets.
- HAAS no longer imports raw machine-row data.
- Belaggning vrum is not a normal table.
- Some columns are unclear and must be preserved in rawData.
- Email delivery depends on SMTP configuration.
- Free email sending still requires configured SMTP credentials or a self-hosted SMTP relay.
- Backups must be copied outside the server for real safety.
- Security must be reviewed continuously as APIs, imports, exports, and admin actions are added.
- The required xlsx package currently has published npm audit advisories with no direct npm fix available.
- The Future integration designer currently uses localStorage and must be converted to PostgreSQL-backed persistence before it becomes production workflow.
- Warehouse map view and 3D view must stay synchronized through shared database slots and assignments.
- Warehouse slot naming must not drift away from the P10A:1 plus FACK structure used by existing inventory data.

## Final Acceptance Checklist

- App runs with Docker Compose.
- App runs locally in development.
- Admin can log in.
- Admin can import Excel.
- Admin can preview import.
- Admin can confirm import.
- Verktygsrum imports into InventoryItem, StorageLocation, StockBalance, and StockMovement.
- Belaggning vrum can be selected as a location reference or ignored during assisted import.
- OKUMA raw machine rows are ignored.
- HAAS raw machine rows are ignored.
- Unknown Excel data is preserved in rawData JSON.
- Structured inventory data is stored in PostgreSQL.
- User can search structured inventory tables.
- User can create and save warehouse layouts.
- User can generate and edit warehouse shelves/slots using P10A:1 plus FACK placement.
- User can link warehouses to inventory groups/tables.
- User can assign inventory rows to warehouse slots.
- Warehouse map view shows occupied/free shelf slots.
- Warehouse 3D view shows pallets for assigned slots.
- Item details can open the assigned slot in the 3D warehouse view.
- Admin/manager can add/edit tools.
- Admin can archive/restore tools.
- Admin can export Excel.
- Weekly email summary works.
- Daily backup works.
- Backup status is visible.
- Security baseline is reviewed and documented.
- README explains setup and restore.
- No non-schema source file exceeds 350 lines.
