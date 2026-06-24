# Mobile-Responsive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the entire Tool Inventory System UI work natively on phone screens by adding Tailwind responsive breakpoint classes and a slide-in mobile navigation drawer.

**Architecture:** All changes are additive Tailwind class edits on existing components. The shared `Modal.tsx` gets a single fix that propagates to all modals. Tables gain an inline `md:hidden` card list alongside the existing `hidden md:block` table. Navigation gets a hamburger → slide-in Sidebar overlay.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide React icons

---

## File Map

| File | Change |
|---|---|
| `client/src/hooks/useIsMobile.ts` | **Create** – mobile breakpoint hook |
| `client/src/components/layout/AppShell.tsx` | Modify – add `sidebarOpen` state |
| `client/src/components/layout/Topbar.tsx` | Modify – hamburger button, remove icon nav |
| `client/src/components/layout/Sidebar.tsx` | Modify – fixed overlay on mobile |
| `client/src/components/Modal.tsx` | Modify – full-screen on mobile |
| `client/src/components/structured-inventory/StockRowDetailsDrawer.tsx` | Modify – stack notes panel below content |
| `client/src/components/qr/QrScannerModal.tsx` | Modify – full viewport on mobile |
| `client/src/components/structured-inventory/StructuredStockRowsTable.tsx` | Modify – mobile card list |
| `client/src/components/tools/ToolsTable.tsx` | Modify – mobile card list |
| `client/src/components/locations/LocationsTable.tsx` | Modify – mobile card list |
| `client/src/components/machines/MachineInventoryTable.tsx` | Modify – mobile card list |
| `client/src/components/admin/UsersTable.tsx` | Modify – mobile card list |
| `client/src/components/import/structured/StagingRowsTable.tsx` | Modify – horizontal scroll wrapper |
| `client/src/components/qr/QrScanResultCard.tsx` | Modify – stack image/info on mobile |
| `client/src/pages/WarehouseDesignPage.tsx` | Modify – mobile gate message |
| `client/src/components/structured-inventory/StructuredTableSearchFilters.tsx` | Modify – filter row stacks on mobile |

---

## Task 1: Create `useIsMobile` hook

**Files:**
- Create: `client/src/hooks/useIsMobile.ts`

- [ ] **Step 1: Create the hook**

```typescript
// client/src/hooks/useIsMobile.ts
import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < breakpoint);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useIsMobile.ts
git commit -m "feat: add useIsMobile hook for mobile breakpoint detection"
```

---

## Task 2: Mobile navigation — AppShell, Topbar, Sidebar

**Files:**
- Modify: `client/src/components/layout/AppShell.tsx`
- Modify: `client/src/components/layout/Topbar.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

**Context:** The current Topbar renders a row of icon-only nav buttons (`flex gap-1 lg:hidden`) that overflow on small phones. The Sidebar is `hidden lg:flex` with no mobile fallback. Replace both with a hamburger button → slide-in Sidebar overlay.

- [ ] **Step 1: Replace `AppShell.tsx`**

```tsx
// client/src/components/layout/AppShell.tsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <div className="flex-1 px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Replace `Topbar.tsx`** (removes existing mobileNav icon row, adds hamburger)

```tsx
// client/src/components/layout/Topbar.tsx
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { logout, user } = useAuth();

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-line bg-slate-950/70 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          aria-label="Open navigation"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-slate-300 hover:border-accent hover:text-accent lg:hidden"
          onClick={onMenuClick}
          type="button"
        >
          <Menu aria-hidden="true" size={20} />
        </button>
        <div>
          <div className="text-sm font-medium text-white">{user?.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck aria-hidden="true" size={13} />
            {user?.role}
          </div>
        </div>
      </div>

      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-accent"
        onClick={() => void logout()}
        title="Sign out"
        type="button"
      >
        <LogOut aria-hidden="true" size={17} />
      </button>
    </header>
  );
}
```

- [ ] **Step 3: Replace `Sidebar.tsx`** (fixed overlay on mobile, static in flex flow on lg+)

```tsx
// client/src/components/layout/Sidebar.tsx
import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  MapPinned,
  PackageMinus,
  Settings,
  UserCircle,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const primaryItems = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Used In", href: "/used-in", icon: Boxes },
  { label: "Taken Items", href: "/taken-items", icon: PackageMinus },
  { label: "Warehouses", href: "/warehouses", icon: Warehouse },
  { label: "Locations", href: "/locations", icon: MapPinned },
  { label: "Import", href: "/import", icon: FileSpreadsheet, adminOnly: true },
  { label: "Users", href: "/admin/users", icon: Users, adminOnly: true },
  { label: "Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const visibleItems = primaryItems.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col overflow-y-auto border-r border-line bg-slate-950/95 px-4 py-5 transition-transform duration-200",
          "lg:static lg:inset-auto lg:min-h-screen lg:bg-slate-950/80 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div>
            <div className="text-lg font-semibold text-white">Tool Inventory</div>
            <div className="text-sm text-slate-400">Internal system</div>
          </div>
          <button
            aria-label="Close navigation"
            className="rounded-md border border-line p-1.5 text-slate-400 hover:text-white lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col justify-between space-y-6" aria-label="Main navigation">
          <div className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                      isActive
                        ? "border border-line bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white",
                    ].join(" ")
                  }
                  key={item.href}
                  onClick={onClose}
                  to={item.href}
                >
                  <Icon aria-hidden="true" size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          <div className="border-t border-line pt-4">
            <NavLink
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                  isActive
                    ? "border border-line bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                ].join(" ")
              }
              onClick={onClose}
              to="/profile"
            >
              <UserCircle aria-hidden="true" size={18} />
              {user?.name || "Profile"}
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
}
```

- [ ] **Step 4: Visual test** — open the app at 375px width. Confirm: sidebar is hidden, hamburger ☰ appears in topbar, tapping ☰ slides sidebar in from left, tapping backdrop or a nav link closes it. At 1024px+ sidebar is always visible with no hamburger.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout/AppShell.tsx client/src/components/layout/Topbar.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat: replace topbar icon nav with hamburger slide-in sidebar drawer on mobile"
```

---

## Task 3: Modal full-screen on mobile

**Files:**
- Modify: `client/src/components/Modal.tsx`

**Context:** Current Modal uses `max-h-[65vh]` and centered `translate` positioning. On mobile it should cover the full viewport — no rounded corners, no padding around it.

- [ ] **Step 1: Replace `Modal.tsx`**

```tsx
// client/src/components/Modal.tsx
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  maxWidth?: string;
  onClose?: () => void;
};

export function Modal({ children, maxWidth = "max-w-3xl", onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={[
          "fixed z-50 flex flex-col overflow-hidden bg-slate-950 shadow-2xl",
          // Mobile: full-screen, no rounding
          "inset-0",
          // sm+: centered panel with max dimensions
          `sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:border-line sm:max-h-[90vh] sm:w-[calc(100%-2rem)] sm:${maxWidth}`,
        ].join(" ")}
      >
        {children}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Visual test** — open any item detail drawer on a 375px screen. Confirm the modal fills the entire screen. At 640px+ confirm it's centered with rounded corners and max-width respected.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Modal.tsx
git commit -m "feat: make Modal full-screen on mobile viewports"
```

---

## Task 4: StockRowDetailsDrawer — stack notes panel on mobile

**Files:**
- Modify: `client/src/components/structured-inventory/StockRowDetailsDrawer.tsx`

**Context:** The drawer body is a flex row — `flex-1 content area` + `ItemNotesPanel` sidebar. On mobile these need to stack vertically.

- [ ] **Step 1: Change the body flex row to stack on mobile**

In `StockRowDetailsDrawer.tsx`, find:
```tsx
<div className="flex flex-1 overflow-hidden">
  <div className="flex-1 overflow-y-auto p-5">
```

Replace with:
```tsx
<div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
  <div className="flex-1 overflow-y-auto p-5">
```

- [ ] **Step 2: Wrap header buttons so they don't overflow on small screens**

Find:
```tsx
<div className="flex gap-2">
  {!isEditing && canTakeReturn && tableId && (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:border-red-400 hover:bg-red-500/20"
```

Replace with:
```tsx
<div className="flex flex-wrap gap-2">
  {!isEditing && canTakeReturn && tableId && (
    <button
      className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:border-red-400 hover:bg-red-500/20"
```

- [ ] **Step 3: Make footer Save/Cancel buttons full-width on mobile**

Find:
```tsx
<footer className="flex items-center justify-between border-t border-line p-5">
  <span className="text-sm text-emerald-200">{message}</span>
  <div className="flex gap-2">
```

Replace with:
```tsx
<footer className="flex flex-col gap-3 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between">
  <span className="text-sm text-emerald-200">{message}</span>
  <div className="flex gap-2">
```

And the Cancel/Save buttons:
```tsx
<button
  className="flex-1 rounded-md border border-line px-4 py-2.5 text-sm font-semibold text-slate-200 sm:flex-none"
  onClick={() => setIsEditing(false)}
  type="button"
>
  Cancel
</button>
<button
  className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 sm:flex-none"
  onClick={save}
  type="button"
>
  Save edit
</button>
```

- [ ] **Step 4: Visual test** — open an item detail on 375px. Confirm main content scrolls, notes panel appears below (not beside) on mobile, and stacks side-by-side on 640px+.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/structured-inventory/StockRowDetailsDrawer.tsx
git commit -m "feat: stack notes panel and footer buttons vertically on mobile in item drawer"
```

---

## Task 5: QrScannerModal — full viewport on mobile

**Files:**
- Modify: `client/src/components/qr/QrScannerModal.tsx`

**Context:** The outer overlay has `p-4` padding and the inner `<section>` has `max-w-3xl`. On mobile the camera feed should fill the full screen.

- [ ] **Step 1: Remove padding from overlay on mobile, make inner section full-screen on mobile**

Find:
```tsx
<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
  <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-slate-950 shadow-2xl">
```

Replace with:
```tsx
<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4">
  <section className="flex h-full w-full flex-col overflow-hidden bg-slate-950 shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-xl sm:border sm:border-line">
```

- [ ] **Step 2: Visual test** — open QR scanner on 375px. Confirm the modal fills the full screen with no gaps. At 640px+ confirm it shows as a centered rounded panel.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/qr/QrScannerModal.tsx
git commit -m "feat: QR scanner modal fills full viewport on mobile"
```

---

## Task 6: StructuredStockRowsTable — mobile card list

**Files:**
- Modify: `client/src/components/structured-inventory/StructuredStockRowsTable.tsx`

**Context:** This is the main inventory table. On mobile (`md:` breakpoint) replace rows with tappable cards. On md+ show the existing table unchanged.

- [ ] **Step 1: Add `ChevronRight` to the import**

Find:
```tsx
import { Archive, Eye, PackageMinus, RotateCcw, Trash2 } from "lucide-react";
```
Replace with:
```tsx
import { Archive, ChevronRight, Eye, PackageMinus, RotateCcw, Trash2 } from "lucide-react";
```

- [ ] **Step 2: Replace the return statement of `StructuredStockRowsTable`**

Find:
```tsx
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
```

Replace with:
```tsx
  return (
    <div>
      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <button
            className={[
              "w-full rounded-lg border bg-panel p-4 text-left shadow-industrial",
              row.id === highlightedRowId ? "border-accent/60 bg-accent/5" : "border-line",
            ].join(" ")}
            key={row.id}
            onClick={() => onOpen(row)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{row.item.name}</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {row.item.articleNumber ?? row.item.alternativeArticleNumber ?? "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatPlacement(row.location)}
                  {row.compartment ? ` / FACK ${row.compartment}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm text-slate-300">
                  {formatNumber(row.quantity)} {row.unit}
                </span>
                <ChevronRight className="text-slate-500" size={16} />
              </div>
            </div>
            {row.usageTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {row.usageTags.map((tag) => (
                  <span
                    className="rounded border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] text-accent"
                    key={tag.cardId}
                  >
                    {tag.quantity} used in {tag.cardName}
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {/* Desktop: existing table */}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-panel shadow-industrial md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
```

- [ ] **Step 3: Close the new wrapper divs** — the existing return statement closes with three `</div>` tags. After the edit in Step 2, the structure needs one extra closing `</div>` for the outer wrapper. The full end of the return statement should look like this:

```tsx
          </tbody>
        </table>
      </div>
    </div>   {/* closes hidden md:block desktop wrapper */}
  </div>     {/* closes outer <div> */}
  );
```

In practice: find the last line of the original return `</div>\n    </div>\n  );` and replace it with `</div>\n      </div>\n    </div>\n  );`.

- [ ] **Step 4: Visual test** — view the inventory table on 375px. Confirm rows show as tappable cards with item name, article, placement, and quantity. Tapping opens the detail drawer. At 768px+ confirm the table renders normally.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/structured-inventory/StructuredStockRowsTable.tsx
git commit -m "feat: show inventory rows as tappable cards on mobile"
```

---

## Task 7: ToolsTable — mobile card list

**Files:**
- Modify: `client/src/components/tools/ToolsTable.tsx`

- [ ] **Step 1: Add `ChevronRight` to imports**

Find:
```tsx
import { Archive, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
```
Replace with:
```tsx
import { Archive, ChevronRight, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
```

- [ ] **Step 2: Wrap the existing content in a desktop `hidden md:block` div and add a mobile card list before it**

Find the return statement opening in `ToolsTable`:
```tsx
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial backdrop-blur">
```

Replace with:
```tsx
  return (
    <div>
      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />
        ) : null}
        {!isLoading && tools.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
            No tools match the current filters.
          </p>
        ) : null}
        {!isLoading
          ? tools.map((tool) => (
              <button
                className="w-full rounded-lg border border-line bg-panel p-4 text-left shadow-industrial"
                key={tool.id}
                onClick={() => onView(tool)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{tool.productName}</p>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {[tool.articleNumber, tool.manufacturer?.name, tool.toolType?.name]
                        .filter(Boolean)
                        .join(" / ") || "No metadata"}
                    </p>
                    <div className="mt-2">
                      <PlacementBadge tool={tool} />
                    </div>
                  </div>
                  <ChevronRight className="mt-1 shrink-0 text-slate-500" size={16} />
                </div>
              </button>
            ))
          : null}
      </div>

      {/* Desktop: existing table */}
      <section className="hidden overflow-hidden rounded-lg border border-line bg-panel shadow-industrial backdrop-blur md:block">
```

- [ ] **Step 3: Close the new outer `<div>`** — find the last `</section>` closing the tools table section and add `</div>` after it:

```tsx
      </section>
    </div>
  );
```

- [ ] **Step 4: Visual test** — view the tools page on 375px. Cards show tool name, article/manufacturer/type, and placement badge. Tapping opens the detail drawer.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/tools/ToolsTable.tsx
git commit -m "feat: show tools as tappable cards on mobile"
```

---

## Task 8: LocationsTable and MachineInventoryTable — mobile card lists

**Files:**
- Modify: `client/src/components/locations/LocationsTable.tsx`
- Modify: `client/src/components/machines/MachineInventoryTable.tsx`

### LocationsTable

- [ ] **Step 1: Add mobile card list to `LocationsTable`**

Find the return statement:
```tsx
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
      <div className="overflow-x-auto">
```

Replace with:
```tsx
  return (
    <div>
      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />
        ) : null}
        {!isLoading && locations.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">No locations match this view.</p>
        ) : null}
        {!isLoading
          ? locations.map((location) => (
              <div className="rounded-lg border border-line bg-panel p-4" key={location.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-white">
                    {formatNullable(location.rawLabel ?? location.shelf)}
                  </p>
                  <OccupancyBadge location={location} />
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {[
                    location.compartment ? `FACK ${location.compartment}` : null,
                    location.sourceSheet,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No extra info"}
                </p>
              </div>
            ))
          : null}
      </div>

      {/* Desktop: existing table */}
      <section className="hidden overflow-hidden rounded-lg border border-line bg-panel shadow-industrial md:block">
        <div className="overflow-x-auto">
```

- [ ] **Step 2: Close the new outer `<div>` in LocationsTable** — after the final `</section>`:

```tsx
      </section>
    </div>
  );
```

### MachineInventoryTable

- [ ] **Step 3: Add mobile card list to `ToolRows` inside `MachineInventoryTable.tsx`**

Find in the `ToolRows` function:
```tsx
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
      <div className="overflow-x-auto">
        <table className="min-w-[1220px] table-fixed divide-y divide-line text-left text-sm">
```

Replace with:
```tsx
  return (
    <div>
      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />
        ) : null}
        {!isLoading && tools.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
            No database tools are assigned to this machine.
          </p>
        ) : null}
        {!isLoading
          ? tools.map((tool) => (
              <div className="rounded-lg border border-line bg-panel p-4" key={tool.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{tool.productName}</p>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {[tool.articleNumber, tool.manufacturer?.name].filter(Boolean).join(" / ") || "-"}
                    </p>
                    <div className="mt-2">
                      <PlacementBadge tool={tool} />
                    </div>
                  </div>
                  {onView ? (
                    <button
                      className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-slate-200 hover:border-accent"
                      onClick={() => onView(tool)}
                      type="button"
                    >
                      Open
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          : null}
      </div>

      {/* Desktop: existing table */}
      <section className="hidden overflow-hidden rounded-lg border border-line bg-panel shadow-industrial md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1220px] table-fixed divide-y divide-line text-left text-sm">
```

- [ ] **Step 4: Close the new outer `<div>` in MachineInventoryTable** — after the final `</section>`:

```tsx
      </section>
    </div>
  );
```

- [ ] **Step 5: Visual test** — view locations page and machine detail page on 375px. Cards show key fields. Tables render on 768px+.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/locations/LocationsTable.tsx client/src/components/machines/MachineInventoryTable.tsx
git commit -m "feat: mobile card lists for locations and machine inventory tables"
```

---

## Task 9: UsersTable — mobile card list

**Files:**
- Modify: `client/src/components/admin/UsersTable.tsx`

- [ ] **Step 1: Add mobile card list above the `overflow-x-auto` div**

Find:
```tsx
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead
```

Replace with:
```tsx
      {/* Mobile: card list */}
      <div className="space-y-2 p-4 md:hidden">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />
        ) : null}
        {!isLoading && users.length === 0 ? (
          <p className="text-sm text-slate-400">No users found.</p>
        ) : null}
        {!isLoading
          ? users.map((user) => {
              const profile = user.profile;
              const fullName = profile
                ? `${profile.firstName} ${profile.lastName}`
                : user.name;
              return (
                <div className="rounded-lg border border-line bg-white/[0.03] p-4" key={user.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{fullName}</p>
                      <p className="mt-0.5 text-sm text-slate-400">{user.email}</p>
                    </div>
                    <StatusPill active={user.isActive} />
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <RoleSelect
                      disabled={user.id === currentUserId}
                      onChange={(role) => onUpdate(user.id, { role })}
                      value={user.role}
                    />
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={user.id === currentUserId}
                      onClick={() => onUpdate(user.id, { isActive: !user.isActive })}
                      title={user.isActive ? "Deactivate" : "Reactivate"}
                      type="button"
                    >
                      {user.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                  </div>
                </div>
              );
            })
          : null}
      </div>

      {/* Desktop: existing table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead
```

- [ ] **Step 2: Visual test** — view the users admin page on 375px. Cards show name, email, status, role selector, and activate/deactivate button. Table renders on 768px+.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/admin/UsersTable.tsx
git commit -m "feat: mobile card list for users admin table"
```

---

## Task 10: StagingRowsTable — ensure horizontal scroll on mobile

**Files:**
- Modify: `client/src/components/import/structured/StagingRowsTable.tsx`

**Context:** The table has `overflow-hidden` on its container which prevents horizontal scrolling on narrow screens. Change to `overflow-x-auto`.

- [ ] **Step 1: Change `overflow-hidden` to `overflow-x-auto` on the table container**

Find:
```tsx
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel">
      <table className="min-w-full divide-y divide-line text-sm">
```

Replace with:
```tsx
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-panel">
      <table className="min-w-full divide-y divide-line text-sm">
```

- [ ] **Step 2: Visual test** — open the import wizard staging preview on 375px. Confirm you can scroll the table horizontally and columns are not squeezed.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/import/structured/StagingRowsTable.tsx
git commit -m "fix: allow horizontal scroll on staging rows table on mobile"
```

---

## Task 11: QrScanResultCard — stack image and info on mobile

**Files:**
- Modify: `client/src/components/qr/QrScanResultCard.tsx`

**Context:** The card uses `grid-cols-[120px_1fr]` which squeezes image and info side by side on mobile. Stack them on mobile.

- [ ] **Step 1: Change the image/info grid to stack on mobile**

Find:
```tsx
      <div className="grid gap-4 md:grid-cols-[120px_1fr]">
```

Replace with:
```tsx
      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
```

- [ ] **Step 2: Make note/issue form buttons full-width on mobile**

Find (first form):
```tsx
          <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submitNote}>
```

Replace with:
```tsx
          <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={submitNote}>
```

Find (second form):
```tsx
          <form className="grid gap-2 md:grid-cols-[1fr_auto]" onSubmit={submitIssue}>
```

Replace with:
```tsx
          <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={submitIssue}>
```

- [ ] **Step 3: Visual test** — scan a QR code on 375px. Confirm item image appears above the item info, not beside it. Note and issue inputs are full-width with button below on mobile.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/qr/QrScanResultCard.tsx
git commit -m "feat: stack QR scan result image above item info on mobile"
```

---

## Task 12: WarehouseDesignPage — mobile gate

**Files:**
- Modify: `client/src/pages/WarehouseDesignPage.tsx`

**Context:** The 3D Babylon.js designer cannot be used on a phone. Show a clear notice instead of loading the 3D canvas on mobile. Use the `useIsMobile` hook.

- [ ] **Step 1: Import `useIsMobile` and add gate to `CreateDesignPage` and `EditDesignPage`**

Add the import at the top of the file:
```tsx
import { useIsMobile } from "../hooks/useIsMobile";
```

In `CreateDesignPage`, add this block immediately before the `return` statement:
```tsx
  const isMobile = useIsMobile();
  if (isMobile) {
    return <MobileGate />;
  }
```

In `EditDesignPage`, add this block after the loading/error guards and before the main return:
```tsx
  const isMobile = useIsMobile();
```

Then change the final `return (` block of `EditDesignPage` to gate the 3D canvas:
```tsx
  if (isMobile) return <MobileGate />;

  return (
```

- [ ] **Step 2: Add the `MobileGate` component** at the bottom of the file (before the `DesignerLoading` function):

```tsx
function MobileGate() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="rounded-xl border border-line bg-panel p-10 text-center">
        <Warehouse className="mx-auto text-accent" size={40} />
        <h2 className="mt-4 text-xl font-semibold text-white">Desktop only</h2>
        <p className="mt-2 max-w-md mx-auto text-sm text-slate-400">
          The 3D warehouse designer requires a larger screen. Please open this page on a desktop or tablet.
        </p>
      </div>
    </div>
  );
}
```

Note: `Warehouse` is already imported at the top of the file from `lucide-react`. If it is not already imported, add it:
```tsx
import { ArrowLeft, Save, Warehouse } from "lucide-react";
```

- [ ] **Step 3: Visual test** — navigate to `/warehouses/new` on 375px. Confirm the desktop-only notice appears. At 768px+ confirm the 3D designer loads normally.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/WarehouseDesignPage.tsx
git commit -m "feat: show desktop-only notice for 3D warehouse designer on mobile"
```

---

## Task 13: StructuredTableSearchFilters — attribute filter row stacks on mobile

**Files:**
- Modify: `client/src/components/structured-inventory/StructuredTableSearchFilters.tsx`

**Context:** The `AttributeFilterRow` uses `md:grid-cols-[minmax(180px,260px)_1fr_auto]` which is already responsive (stacks below md). The main filter bar uses `xl:grid-cols-[...]` — also already stacks below xl. However the main grid needs `gap-2` and `grid-cols-1` as the default (mobile-first) which it already has implicitly from Tailwind. Verify and confirm no change is needed, OR add explicit `grid-cols-1` if filters don't stack.

- [ ] **Step 1: Verify the main filter grid stacks on mobile**

The current class is:
```
grid gap-2 xl:grid-cols-[minmax(220px,1fr)_210px_210px_auto_auto]
```

`grid` without a `grid-cols-*` defaults to `grid-cols-1` in Tailwind — inputs stack vertically below xl. This is already correct. **No change needed to the grid.**

- [ ] **Step 2: Ensure the Search button is full-width on mobile**

Find:
```tsx
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" type="submit">
```

Replace with:
```tsx
        <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 xl:w-auto" type="submit">
```

- [ ] **Step 3: Visual test** — open an inventory table on 375px. Confirm filters stack in a single column, Search button is full-width.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/structured-inventory/StructuredTableSearchFilters.tsx
git commit -m "feat: full-width search button on mobile in inventory filter bar"
```

---

## Task 14: Final responsive pass — remaining pages

**Files:**
- Modify: `client/src/pages/LoginPage.tsx` (already fine — verify only)
- Modify: `client/src/components/structured-inventory/StockRowEditBody.tsx` (check form grid)

### LoginPage (verify — likely no change needed)

- [ ] **Step 1: Verify LoginPage is already mobile-friendly**

The current LoginPage has `px-4` on the outer `<main>` and `w-full max-w-md` on the card. This already works on mobile. **No changes needed.** If the form inputs ever overflow, add `min-w-0` — but they currently use `w-full`.

### StockRowEditBody (check for fixed grid)

- [ ] **Step 2: Read and check `StockRowEditBody.tsx` for any fixed grid-cols**

```bash
# Run in terminal to check
grep -n "grid-cols" client/src/components/structured-inventory/StockRowEditBody.tsx
```

If any `grid-cols-2` or `grid-cols-3` appear **without** a responsive prefix (`md:` or `sm:`), wrap them:
- Change `grid-cols-2` → `grid-cols-1 md:grid-cols-2`
- Change `grid-cols-3` → `grid-cols-1 md:grid-cols-3`

- [ ] **Step 3: Check `InventoryCreatePanel.tsx`, `TableCreatePanel.tsx`, `WarehouseCreatePanel.tsx` for fixed grids**

```bash
grep -n "grid-cols" \
  client/src/components/structured-inventory/InventoryCreatePanel.tsx \
  client/src/components/structured-inventory/TableCreatePanel.tsx \
  client/src/components/warehouses/WarehouseCreatePanel.tsx
```

For any `grid-cols-2` or `grid-cols-3` without a breakpoint prefix, prepend `grid-cols-1 md:`:

Example: `grid gap-3 grid-cols-2` → `grid gap-3 grid-cols-1 md:grid-cols-2`

- [ ] **Step 4: Check `InviteUserForm.tsx` and `EmailSettingsPanel.tsx`**

```bash
grep -n "grid-cols" \
  client/src/components/admin/InviteUserForm.tsx \
  client/src/components/admin/EmailSettingsPanel.tsx
```

Apply the same fix: add `grid-cols-1 md:` prefix where missing.

- [ ] **Step 5: Commit any changes from steps 2-4**

```bash
git add -p   # stage only the responsive grid fixes
git commit -m "feat: make form grids single-column on mobile"
```

---

---

## Task 15: Remaining page grid fixes

**Files:**
- Modify: `client/src/pages/ProfilePage.tsx`
- Modify: `client/src/pages/TakenItemsPage.tsx`
- Modify: `client/src/pages/UsedInPage.tsx`
- Modify: `client/src/pages/MachinesPage.tsx`
- Modify: `client/src/pages/LocationMapPage.tsx`
- Modify: `client/src/components/warehouses/WarehouseDetailsPanel.tsx`
- Modify: `client/src/components/machines/MachineCards.tsx`
- Modify: `client/src/pages/ImportPage.tsx`

- [ ] **Step 1: Fix all `grid-cols-2` / `grid-cols-3` without breakpoint prefixes across remaining pages**

Run this grep to find every fixed grid in the remaining files:
```bash
grep -rn "grid-cols-[23]" \
  client/src/pages/ProfilePage.tsx \
  client/src/pages/TakenItemsPage.tsx \
  client/src/pages/UsedInPage.tsx \
  client/src/pages/UsedInDetailsPage.tsx \
  client/src/pages/MachinesPage.tsx \
  client/src/pages/MachineDetailsPage.tsx \
  client/src/pages/LocationMapPage.tsx \
  client/src/pages/AdminSettingsPage.tsx \
  client/src/components/warehouses/WarehouseDetailsPanel.tsx \
  client/src/components/warehouses/WarehouseShelvesPanel.tsx \
  client/src/components/machines/MachineCards.tsx \
  client/src/pages/ImportPage.tsx \
  client/src/components/import/ImportSummaryCards.tsx
```

For each match, apply this rule:
- `grid-cols-2` (no prefix) → `grid-cols-1 sm:grid-cols-2`
- `grid-cols-3` (no prefix) → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Already-prefixed classes like `md:grid-cols-2` are fine — leave them alone

- [ ] **Step 2: Add horizontal scroll to `LocationMapGrid`**

Read `client/src/components/locations/LocationMapGrid.tsx`. Find the outermost wrapper div and ensure it has `overflow-x-auto`:
```tsx
// Wrap the grid/map content with:
<div className="overflow-x-auto">
  {/* existing map content */}
</div>
```

- [ ] **Step 3: Visual test** — check ProfilePage, MachinesPage, LocationMapPage, and UsedInPage on 375px. All grids should stack to single column or 2-col max. Location map scrolls horizontally.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ProfilePage.tsx client/src/pages/TakenItemsPage.tsx \
        client/src/pages/UsedInPage.tsx client/src/pages/UsedInDetailsPage.tsx \
        client/src/pages/MachinesPage.tsx client/src/pages/MachineDetailsPage.tsx \
        client/src/pages/LocationMapPage.tsx client/src/pages/AdminSettingsPage.tsx \
        client/src/components/warehouses/WarehouseDetailsPanel.tsx \
        client/src/components/warehouses/WarehouseShelvesPanel.tsx \
        client/src/components/machines/MachineCards.tsx \
        client/src/pages/ImportPage.tsx \
        client/src/components/import/ImportSummaryCards.tsx
git commit -m "feat: responsive grid fixes across remaining pages and components"
```

---

## Self-Review Checklist

After all tasks are complete, open the app in a browser at **375px width** (iPhone SE) and verify:

- [ ] ☰ hamburger appears in topbar; tapping slides in sidebar; backdrop tap closes it
- [ ] Sidebar nav links close the drawer on tap
- [ ] Any item detail modal (click a stock row) fills full screen; notes panel below content
- [ ] QR scanner modal fills full screen; camera viewfinder is large
- [ ] All inventory tables show cards on mobile; tables show on 768px+
- [ ] Warehouse designer page shows "Desktop only" notice
- [ ] Login page looks clean with no overflow
- [ ] Import staging preview horizontally scrolls
- [ ] Resize to 1024px — sidebar always visible, no hamburger, tables show normally
