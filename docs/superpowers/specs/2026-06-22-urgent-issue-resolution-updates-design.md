# Urgent Issues — Resolution Updates for Reporters — Design Spec
**Date:** 2026-06-22
**Status:** Draft (awaiting user review)
**Sub-project:** B of 4 (sequence: D → B → C → A)
**Builds on:** `2026-05-29-notes-and-urgent-issues-design.md`

---

## Overview

Urgent issues already exist end-to-end: employees report them, managers/admins resolve/unresolve, the reporter's issues are listed in `MyReportedIssuesWidget`, and the backend already returns `status`, `resolvedAt`, and `resolvedBy {id, name}`.

The missing capability is the requirement *"each user should be able to see their urgent issues … and get updated when resolved too and by whom."* Specifically:

1. **No unread signal** — a reporter can't tell which of their issues was *newly* resolved since they last looked.
2. **Employee-only widget** — `MyReportedIssuesWidget` only renders in the dashboard's `isEmployee` branch, so a manager/admin who reports an issue never sees it.
3. **"When" not shown** — the card shows who resolved but not when.

This sub-project adds a lightweight, dashboard-only "unread dot" update mechanism. Explicitly **out of scope** (user decision): notification bell/center, email-to-reporter, real-time push, and any general Notification model.

---

## Data model (the only DB change)

One nullable field added to `UrgentIssue`:

```prisma
model UrgentIssue {
  // ...existing fields...
  senderAcknowledgedAt DateTime?   // when the reporter acknowledged the CURRENT resolution
}
```

**Unread rule (server-computed):**

```
unread = status == resolved
         AND resolvedAt != null
         AND (senderAcknowledgedAt == null OR senderAcknowledgedAt < resolvedAt)
```

Comparing the acknowledgement against `resolvedAt` (not just null-checking) means an issue that was unresolved and then resolved again correctly returns to **unread**. Tracking lives in PostgreSQL (per the project's source-of-truth rule), so the read/unread state is consistent across devices — no `localStorage`.

When an issue is **unresolved**, `resolvedAt` becomes null (existing behavior), so `unread` is false until it is resolved again. `senderAcknowledgedAt` is left as-is; the `resolvedAt` comparison handles correctness.

---

## Backend (`server/src/modules/urgent-issues/`)

- **Route** — add `PATCH /api/urgent-issues/:id/acknowledge`.
- **Controller** — thin; passes `issueId` + authenticated `userId` to the service.
- **Service** — `acknowledgeResolution(issueId, userId)`:
  - Loads the issue; 404 if missing.
  - **Authorization:** only the issue's `senderId` may acknowledge (403 otherwise). This is a per-user action, not a manager action.
  - Sets `senderAcknowledgedAt = now()`; returns the serialized issue.
- **Repository** — `acknowledgeIssue(issueId)` (DB access only).
- **Serializer** — add a computed `unread: boolean` to the serialized issue using the rule above, so the client never re-derives it. (`UrgentIssue` client type gains `unread: boolean` and the already-present `resolvedAt`.)
- **Schemas** — no body needed; `:id` is a route param (validate as cuid).

No change to the report/resolve/unresolve flows or the manager-facing `UrgentIssuesWidget`.

---

## Frontend

### `client/src/services/urgentIssuesService.ts`
- Add `acknowledge(id: string): Promise<UrgentIssue>` → `PATCH ${BASE}/${id}/acknowledge`.

### `client/src/types/urgent-issues.ts`
- Add `unread: boolean` to `UrgentIssue`.

### `client/src/components/dashboard/MyReportedIssuesWidget.tsx`
- **Unread dot:** issues with `unread === true` render a premium pulse dot + a subtle highlight ring on the card.
- **Acknowledge on click:** the existing `onIssueClick` (which opens the row drawer) also calls `urgentIssuesService.acknowledge(issue.id)` and optimistically clears the card's unread state.
- **Mark all as read:** a small action in the widget header that acknowledges every currently-unread issue (sequential `acknowledge` calls or a follow-up bulk endpoint if the count warrants it — start with per-issue calls; the list is small).
- **Show "when":** display the resolved timestamp on resolved cards ("Resolved by Anna · 2h ago") using the existing relative/absolute formatting style.
- **Unread count:** the widget heading shows an unread badge (e.g. "My Reported Issues · 2") when any are unread.

### `client/src/pages/DashboardPage.tsx`
- **All roles:** move `<MyReportedIssuesWidget />` out of the `isEmployee`-only block so it renders for every authenticated user. The widget self-hides (renders nothing) when the user has no reported issues, so viewers — who cannot report — see nothing.
- Keep `handleIssueClick` wiring (opens the row drawer) intact; the acknowledge call is internal to the widget.

### Light "get updated" without push
- The widget refetches `listMy()` on `document` `visibilitychange` → visible (i.e. when the tab/window regains focus), so a dashboard left open reflects newly-resolved issues on return. No websockets/SSE.

### File-size compliance
`MyReportedIssuesWidget.tsx` is currently 78 lines; the additions stay well under 350. If the unread-dot + mark-all-read logic grows, extract `ReportedIssueCard` into its own file under `components/dashboard/`.

---

## Permissions

| Action | sender | other users | manager/admin |
|--------|--------|-------------|---------------|
| See own reported issues | ✓ | ✗ | ✓ (their own reports) |
| Acknowledge resolution | ✓ (own only) | ✗ | ✓ (own only) |
| Resolve / unresolve | ✗ (unless mgr/admin) | ✗ | ✓ |

Acknowledgement is strictly scoped to the issue's own sender; the server enforces it and never trusts a client-supplied user id.

---

## Testing

**Backend**
- `acknowledge` sets `senderAcknowledgedAt`; non-sender gets 403; missing issue gets 404.
- Serializer `unread` is true for resolved+unacknowledged, false after acknowledge, and true again after unresolve→resolve.

**Frontend**
- Card renders the unread dot only when `unread`.
- Clicking a card acknowledges and clears the dot; "Mark all as read" clears all.
- Widget renders for a manager who has reported an issue and hides for a user with none.

---

## Rollout / verification

Standard gate: `npm run lint && npm run build && npm run check:lines && docker compose up -d --build server client`. Manual pass: as an employee report an issue; as a manager resolve it; as the employee confirm the unread dot + "resolved by … · when", click to acknowledge, confirm the dot clears and stays cleared across reload. Update `PLAN.md` at completion.

---

## Summary of DB changes (as requested)

- **`UrgentIssue`**: `+senderAcknowledgedAt DateTime?` — additive, nullable, no backfill. This is the **only** schema change in sub-project B.
