# Mobile-Responsive UI Design

**Date:** 2026-06-12
**Scope:** Full mobile responsiveness overhaul for the Tool Inventory System client
**Approach:** Tailwind breakpoint classes applied in-place (Option A) — no new component files, no duplication

---

## Goals

Every screen, modal, popup, table, drawer, and navigation element must look and feel as if it was designed natively for a phone screen. The desktop experience must remain unchanged.

---

## Section 1 — Navigation & App Shell

### Strategy
- Below `lg:` breakpoint: sidebar is hidden, a hamburger button appears in the top bar
- Above `lg:` breakpoint: existing sidebar always-visible behavior is unchanged

### `AppShell.tsx`
- Add `sidebarOpen: boolean` state
- Pass `sidebarOpen` and `setSidebarOpen` as props to both `Topbar` and `Sidebar`
- Main layout: `flex` row on `lg+`, single-column (no sidebar in flow) on mobile

### `Topbar.tsx`
- Add a `☰` hamburger button on the left, visible only below `lg:` (`lg:hidden`)
- Tapping calls `setSidebarOpen(true)`

### `Sidebar.tsx`
- `lg+`: keep current behavior (fixed left sidebar, always visible, `hidden lg:flex`)
- Mobile: render as a full-height `fixed` overlay from the left with a semi-transparent backdrop
  - Slide in when `sidebarOpen === true` (Tailwind `translate-x` transition)
  - Tapping a nav link or the backdrop sets `sidebarOpen = false`
- No changes to nav item content or role-based filtering logic

**Files changed:** `AppShell.tsx`, `Topbar.tsx`, `Sidebar.tsx`

---

## Section 2 — Modals & Drawers

### Strategy
- The shared `Modal.tsx` is the single source of truth. One fix propagates to all ~8 modal consumers.

### `Modal.tsx`
- Add `sm:inset-0 sm:max-w-full sm:h-full sm:rounded-none sm:m-0` classes
- Existing `maxWidth` prop still applies on `md+` — no API change
- All consumers (StockRowDetailsDrawer, ToolFormModal, QrScannerModal, etc.) inherit full-screen mobile behavior automatically

### `StockRowDetailsDrawer.tsx`
- Two-column body (`content` + `ItemNotesPanel`): stack vertically on mobile
- Header button row (Urgent Issue / Edit / ✕): wrap on small screens, or compress to icon-only below `sm:`

### `QrScannerModal.tsx`
- Camera viewfinder fills full screen height on mobile
- Action buttons pin to the bottom of the screen

### Footer action bars (Save / Cancel) — all modals
- On mobile: buttons stretch to `w-full` in a stacked column
- On `md+`: existing right-aligned row behavior unchanged

**Files changed:** `Modal.tsx`, `StockRowDetailsDrawer.tsx`, `QrScannerModal.tsx`, plus minor footer adjustments in drawers/modals as needed

---

## Section 3 — Data Tables → Card Lists

### Strategy
- Below `md:`: table is `hidden`, card list is `block`
- Above `md:`: table is `md:block`, card list is `md:hidden`
- Card lists written inline within existing table components — no new files
- All existing row click handlers reused — no logic changes
- Each card has a subtle right-arrow (`›`) to indicate it is tappable

### `StructuredStockRowsTable`
Card fields: item name (bold), article number, quantity + unit, location code, status badge
Action: tap → opens existing `StockRowDetailsDrawer`

### `ToolsTable`
Card fields: tool name, type, manufacturer, placement badge
Action: tap → opens `ToolDetailsDrawer`

### `LocationsTable`
Card fields: location code, type, assigned tool count
Action: tap → navigates to location detail

### `MachineInventoryTable`
Card fields: slot name, linked item, quantity

### `admin/UsersTable`
Card fields: user name, email, role badge, invite status

### `import/structured/StagingRowsTable`
Card fields: item name, article, quantity, validation errors (highlighted red)

**Files changed:** `StructuredStockRowsTable.tsx`, `ToolsTable.tsx`, `LocationsTable.tsx`, `MachineInventoryTable.tsx`, `UsersTable.tsx`, `StagingRowsTable.tsx`

---

## Section 4 — Page Layouts & Forms

### Dashboard (`DashboardPage`, dashboard components)
- `MetricCard` grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- All widgets stack in a single column on mobile

### Inventory pages (`StructuredInventoryGroupPage`, `StructuredInventoryTablePage`)
- `StructuredInventoryHeader`: title + action buttons stack vertically on mobile
- `StructuredTableSearchFilters`: inputs stack to full-width single column
- `TableWidgets` stat bar: wraps to 2-col grid on mobile

### Warehouses (`WarehousesPage`, `WarehouseDetailsPage`)
- `WarehouseCard` grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- `WarehouseDetailsPanel` / `WarehouseShelvesPanel`: panels stack vertically on mobile

### Warehouse Designer (`WarehouseDesignPage`)
- Add `useIsMobile()` hook: `window.innerWidth < 768`, with `resize` event listener
- On mobile: render a full-page notice — *"The 3D warehouse designer requires a larger screen. Please open this page on a desktop or tablet."*
- 3D canvas is not rendered on mobile (no Babylon.js init on phone)

### Forms
Applies to: `StockRowForm`, `AttributeFields`, `InventoryCreatePanel`, `TableCreatePanel`, `WarehouseCreatePanel`, `InviteUserForm`, `EmailSettingsPanel`
- All `grid-cols-2` and `grid-cols-3` layouts change to `grid-cols-1 md:grid-cols-2`

### `QrScanResultCard`
- Item image + info layout (`grid-cols-[120px_1fr]`): stacks to single column on mobile
- Note and issue forms: submit button goes full-width below the input on mobile

### Import wizard (`StructuredImportWizard`, step components)
- Step indicator wraps/abbreviates on mobile
- `StagingRowsTable` gets horizontal scroll on mobile (spatial structure can't become cards)
- All other form steps follow the single-column form rule above

**Files changed:** `DashboardPage.tsx`, `MetricCard.tsx`, `StructuredInventoryHeader.tsx`, `StructuredTableSearchFilters.tsx`, `TableWidgets.tsx`, `WarehouseCard.tsx`, `WarehouseDetailsPanel.tsx`, `WarehouseShelvesPanel.tsx`, `WarehouseDesignPage.tsx`, `StockRowForm.tsx`, `AttributeFields.tsx`, `InventoryCreatePanel.tsx`, `TableCreatePanel.tsx`, `WarehouseCreatePanel.tsx`, `InviteUserForm.tsx`, `EmailSettingsPanel.tsx`, `QrScanResultCard.tsx`, `StructuredImportWizard.tsx`, step components

---

## Section 5 — Remaining Pages & Small Components

### `LoginPage` / `AcceptInvitePage`
- Add `mx-4` padding on mobile so cards don't touch screen edges

### `ProfilePage`
- Info cards and edit form stack to single column

### `AdminSettingsPage` / `AdminUsersPage`
- `InvitationsPanel`: stack sections vertically on mobile

### `TakenItemsPage`
- Taken-items list becomes a card list (same pattern as Section 3)

### `UsedInPage` / `UsedInDetailsPage`
- Cards grid: `grid-cols-1 sm:grid-cols-2`
- Machine slot detail panels stack vertically

### `MachinesPage` / `MachineDetailsPage`
- `MachineCards` grid: `grid-cols-1 sm:grid-cols-2`
- `MachineInventoryTable` covered in Section 3

### `LocationsPage` / `LocationMapPage`
- `LocationMapGrid`: horizontal scroll on mobile (spatial layout, cannot be cards)
- `UnassignedToolsPanel`: stacks below the map on mobile

### `ImportPage`
- Upload panel and summary cards stack to single column

### Small shared components
- `InlineManagerStrip`, `ResourceManagerPicker`, `UserAvatar`: minor spacing/wrapping tweaks only

---

## Breakpoint Reference

| Tailwind prefix | Viewport     | Usage in this design       |
|-----------------|-------------|----------------------------|
| (none)          | all screens | mobile-first base styles   |
| `sm:`           | ≥ 640px     | tablet tweaks, 2-col grids |
| `md:`           | ≥ 768px     | tables show, forms 2-col   |
| `lg:`           | ≥ 1024px    | sidebar shows              |

---

## Out of Scope

- Warehouse 3D designer touch controls (Babylon.js pinch/zoom)
- iOS Safari cross-domain cookie issue (requires custom domain — separate infrastructure task)
- QR scanner camera detection bug (separate bug fix — not a responsive layout issue)
- New pages or features
