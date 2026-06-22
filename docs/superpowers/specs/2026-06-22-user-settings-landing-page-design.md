# User Settings — Landing Page & Premium Polish — Design Spec
**Date:** 2026-06-22
**Status:** Implemented (2026-06-22)
**Sub-project:** D of 4 (sequence chosen: D → B → C → A)

---

## Overview

The Profile page already supports **change password**, **profile-picture upload**, and **personal-info editing** (verified in `client/src/pages/ProfilePage.tsx` + `server/src/modules/profile/`). This sub-project adds the one missing capability and polishes the existing flows:

1. **User-selectable landing destination** — each user (any role) chooses where the app opens after login and on app open: a fixed app page, a specific inventory **group**, or a specific inventory **table**. Falls back to Dashboard if unset or if the saved target is deleted.
2. **Premium polish** of the existing flows:
   - Password: live strength meter + requirement checklist + show/hide toggles.
   - Avatar: square crop & preview (via `react-easy-crop`) + drag-and-drop before upload.
   - App-wide **in-house ToastProvider** (glass toasts) replacing inline notices, plus a refined glass-card Profile layout.

Out of scope: settings tabs reorganization (declined), theme/notification preferences, changes to invitation/reset flows.

---

## Part 1 — Landing Page Preference

### Data model (the only DB change)

Three nullable fields added to `UserProfile` (additive; no backfill needed):

```prisma
model UserProfile {
  // ...existing fields...
  landingType     String?   // "page" | "group" | "table"  (null = default → /dashboard)
  landingPath     String?   // for type "page": a route from the server-side allowlist
  landingTargetId String?   // for type "group" | "table": the InventoryGroup/InventoryTable id
}
```

**Why structured (type + id) instead of a single stored path:** lets the backend validate the target still exists and re-resolve a fresh route, so a renamed/moved group/table never breaks a saved preference.

### Route allowlist (security)

`landingPath` is **never** a free string. It is validated against a fixed allowlist of known app routes, defined once on the backend and mirrored to the client:

```
/dashboard /inventory /used-in /taken-items /warehouses /locations /machines /tools /profile
```

Any value outside the allowlist is rejected by Zod. This prevents open-redirect / arbitrary-path storage.

### Resolution rule

| landingType | Resolved route |
|-------------|----------------|
| `page`      | `landingPath` (must be in allowlist) |
| `group`     | `/inventory/groups/{landingTargetId}` |
| `table`     | `/inventory/tables/{landingTargetId}` |
| null / stale target | `/dashboard` |

On read, if `landingType` is `group`/`table` and the referenced record no longer exists, the backend returns `landingResolvedPath: "/dashboard"` and reports the preference as cleared so the UI can reset it.

### Backend (extend `server/src/modules/profile/`)

- **`profile.schemas.ts`** — extend the update schema:
  - `landingType`: `z.enum(["page","group","table"]).nullable().optional()`
  - `landingPath`: optional, required when type `page`, must be in the allowlist enum
  - `landingTargetId`: optional, required when type `group`/`table` (cuid)
  - Cross-field refinement enforces the type↔field pairing.
- **`profile.service.ts`** — on save: when type is `group`/`table`, verify the record exists (via a repository lookup) and reject with a 400 if not. On read: resolve `landingResolvedPath`, nulling stale targets.
- **`profile.repository.ts`** — add `groupExists(id)` / `tableExists(id)` helpers (DB access only).
- **Auth `me` endpoint** (`meController`, `server/src/modules/auth/auth.controller.ts:45`) — include `landingResolvedPath` in the payload so redirects need no extra round-trip. The client `AuthUser` type (`client/src/types/auth.ts`) gains the same field.

### Frontend

- **`client/src/services/profile.service.ts`** — extend `ProfileData` and `updateProfileRequest` with the 3 landing fields + `landingResolvedPath`.
- **`client/src/constants/landing.ts`** (new) — the page allowlist with human labels + icons, mirrored from backend.
- **`client/src/components/profile/LandingPagePicker.tsx`** (new) — a grouped selector:
  - **App pages** — static allowlist (Dashboard, Inventory, Used In, Taken Items, Warehouses, Locations, Machines, Tools).
  - **Inventory groups** — fetched via existing inventory service.
  - **Inventory tables** — fetched via existing inventory service.
  - Shows the current selection with a "Reset to Dashboard" action. Saves through `updateProfileRequest`.
- **Redirect integration:**
  - `client/src/pages/LoginPage.tsx` — change `const redirectTo = state?.from?.pathname ?? "/dashboard"` to `?? user.landingResolvedPath ?? "/dashboard"`. An explicit `from` (deep-link bounce) still wins.
  - `client/src/app/router.tsx` — add a tiny `LandingRedirect` element at `/` (index) that navigates to `landingResolvedPath`. The `*` catch-all stays `/dashboard`.
  - The auth context already exposes the user; ensure `landingResolvedPath` rides along on `me`.

### Permissions

All authenticated roles (admin, manager, employee, viewer) can set their own landing preference. It is strictly per-user; no one edits another user's landing page.

---

## Part 2 — Premium Polish

### Toast system (app-wide, in-house)

- **`client/src/components/feedback/ToastProvider.tsx`** + **`useToast` hook** + **`ToastViewport`** — context-based, top-right stack, glass/navy styling matching the design tokens, auto-dismiss (~3.5s) with success/error/info variants and manual close.
- Mounted once in `app/providers.tsx`.
- Replaces the inline `<Notice>` success/error blocks in the Profile flows; reusable across the app afterward.

### Password form polish

- Live **strength meter** + **requirement checklist** (≥8 chars, mixed case, number, symbol) updating as the user types. Lightweight in-house scoring function in `client/src/utils/passwordStrength.ts` — **no heavy dependency** (no zxcvbn).
- **Show/hide** eye toggle on each password field.
- Submit still calls the existing `/api/profile/password`; min-length already enforced server-side — keep server validation authoritative.

### Avatar crop & preview

- Add **`react-easy-crop`** dependency.
- **`client/src/components/profile/AvatarCropModal.tsx`** (new) — on file select, open a modal with square crop + zoom; on confirm, export the cropped square to a Blob and upload via the existing `/api/profile/picture`.
- Drag-and-drop a file onto the avatar opens the same modal.
- Existing server-side size/type validation stays authoritative (PNG/JPG/WEBP/GIF, ≤3 MB).

### Layout refinement

- Refine `ProfilePage` into polished glass cards with consistent spacing; **no tabs**. Add the new **Landing page** section beneath the existing sections.

### File-size compliance (AGENTS.md 350-line rule)

`ProfilePage.tsx` is currently 259 lines and will exceed 350 with these additions. Split into `client/src/components/profile/`:
- `AvatarSection.tsx` (+ `AvatarCropModal.tsx`)
- `ProfileForm.tsx`
- `PasswordForm.tsx` (+ strength UI)
- `LandingPagePicker.tsx`

`ProfilePage.tsx` becomes a thin composer. Run `npm run check:lines` before completion.

---

## Testing

**Backend**
- Zod: rejects `landingPath` outside the allowlist; rejects missing `landingTargetId` when type is group/table; enforces type↔field pairing.
- Service: saving a non-existent group/table id is rejected; reading a profile whose saved target was deleted resolves to `/dashboard` and clears the stale target.

**Frontend**
- Landing resolution returns the correct route per type; falls back to `/dashboard` when unset/stale.
- Login redirect prefers an explicit `from` over the landing preference.

---

## Rollout / verification

Standard project gate: `npm run lint && npm run build && npm run check:lines && docker compose up -d --build server client`, then a manual pass: set each landing type, log out/in, confirm the correct page loads; delete a chosen table and confirm graceful fallback. Update `PLAN.md` at completion.

---

## Summary of DB changes (as requested)

- **`UserProfile`**: `+landingType String?`, `+landingPath String?`, `+landingTargetId String?` — additive, nullable, no data backfill. This is the **only** schema change in sub-project D.
