# Design: Swedish-Default i18n with Per-User Language Toggle

**Date:** 2026-06-24  
**Status:** Approved  

---

## Summary

Make Swedish the default language of the Tool Inventory System. Every user can switch to English from their Profile page. The preference is stored per-user in the database and applied immediately on login without a page reload.

---

## 1. Database & Backend

### Schema change
Add `language` field to `UserProfile`:

```prisma
model UserProfile {
  // ... existing fields ...
  language  String  @default("sv")
}
```

- Allowed values: `"sv"` (Swedish, default) | `"en"` (English).
- Existing rows default to `"sv"` via migration.

### API changes
- `GET /api/profile` — extend response to include `language`.
- `PUT /api/profile` — extend Zod input schema to accept `language` (enum `sv | en`).
- No new routes. The existing profile service and repository get the `language` field threaded through.

### Backend layering
- **Schema:** add `language` to profile Zod schema.
- **Repository:** include `language` in `findByUserId` select and `update` write.
- **Service:** pass through without business logic (it is a preference, not a domain rule).
- **Controller:** no change needed beyond what the schema covers.

---

## 2. i18n Setup (Frontend)

### Packages
Install in `client/`:
- `i18next`
- `react-i18next`

### File structure
```
client/src/i18n/
  i18n.ts                   # configures i18next, imports all namespaces, sets 'sv' as default
  locales/
    sv/
      common.json
      navigation.json
      auth.json
      dashboard.json
      inventory.json
      tools.json
      machines.json
      locations.json
      warehouses.json
      import.json
      admin.json
      profile.json
      usedIn.json
      taken.json
    en/
      (mirrors sv/ exactly)
```

### i18n.ts configuration
- Default language: `sv`.
- Fallback language: `sv` (if a key is missing in `en`, fall back to Swedish).
- `initReactI18next` plugin registered.
- All namespace resources bundled at init time (no lazy HTTP loading needed for this app size).

### App wiring
- `I18nextProvider` wraps the app in `client/src/app/providers.tsx`.
- After the auth context loads the user, call `i18next.changeLanguage(user.language ?? 'sv')`.
- On logout, reset to `'sv'`.

---

## 3. Language Picker (Profile Page)

### New component
`client/src/components/profile/LanguagePicker.tsx`

- Styled consistently with `LandingPagePicker` (card panel, same spacing and border style).
- Renders two selectable options: **Svenska** and **English**.
- On selection:
  1. Calls `PUT /api/profile` with `{ language: 'sv' | 'en' }`.
  2. On success, calls `i18next.changeLanguage(lang)` — UI switches instantly, no reload.
  3. Shows a success toast.
- Added to `ProfilePage.tsx` below the existing `<LandingPagePicker />`.

---

## 4. String Replacement (Full App)

### Scope
Every user-visible hardcoded string in all `.tsx` files across:
- 22 page files
- 60+ component files
- Layout components (AppShell, Sidebar, Topbar)

### Method
- Each file adds `const { t } = useTranslation('namespace')` where namespace matches the feature area.
- Keys use dot-notation: `t('header.title')`, `t('actions.save')`, `t('errors.notFound')`.
- Both `sv/` and `en/` JSON files are written in full for every namespace with matching keys.

### What is NOT translated
- Internal error strings never shown to users (server logs, console errors).
- Database values (tool names, location codes, inventory item names — these are user data, not UI strings).
- Prisma/backend validation error messages that are logged server-side only.

### Namespace assignment
| Namespace    | Covers |
|-------------|--------|
| `common`    | Save, Cancel, Loading, Error, Confirm, Yes, No, Delete, Edit, Search, Back, Close |
| `navigation`| Sidebar links, page section labels, topbar items |
| `auth`      | Login, Forgot password, Reset password, Accept invite pages |
| `dashboard` | Dashboard page and all its widgets |
| `inventory` | Inventory pages, structured inventory components |
| `tools`     | Tools page and tool-related components |
| `machines`  | Machines page and machine detail components |
| `locations` | Locations page and location map |
| `warehouses`| Warehouses page, warehouse designer, warehouse detail |
| `import`    | Import wizard, all import step components |
| `admin`     | Admin settings, admin users, email settings, backup panel |
| `profile`   | Profile page, avatar, password form, landing page picker, language picker |
| `usedIn`    | Used In page and detail page |
| `taken`     | Taken Items page |

---

## 5. Auth Flow Integration

```
User logs in
  → AuthProvider fetches /api/profile
  → Reads profile.language ('sv' or 'en')
  → Calls i18next.changeLanguage(profile.language)
  → All components re-render in the correct language

User changes language in Profile
  → PUT /api/profile { language: 'en' }
  → i18next.changeLanguage('en') called client-side
  → UI switches instantly

User logs out
  → i18next.changeLanguage('sv') — reset to default
```

---

## 6. Constraints & Rules Observed

- No translation file will exceed 350 lines (namespace splitting ensures this).
- No API calls inside visual components — `LanguagePicker` calls a service function, not fetch directly.
- TypeScript strict mode — translation keys will be typed via `i18next` TypeScript integration.
- Existing file-size policy applies — if a component file exceeds 300 lines after adding `useTranslation`, split it first.
