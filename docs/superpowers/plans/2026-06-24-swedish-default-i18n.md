# Swedish-Default i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Swedish the default language of the Tool Inventory System, with English selectable per-user from the Profile page, preference saved in the database.

**Architecture:** react-i18next with 14 namespace-split JSON files (one per feature area). A `language` field on `UserProfile` stores the preference. The auth context applies `i18next.changeLanguage()` after login. A new `LanguagePicker` component in ProfilePage writes to the same field.

**Tech Stack:** react-i18next, i18next, Prisma (PostgreSQL), Express, React 19, TypeScript strict, Vite, Tailwind CSS.

## Global Constraints

- No source file may exceed 350 lines. Split before editing if a file is at 300+.
- No API calls inside visual components — call service functions.
- TypeScript strict mode. No `any`.
- Follow existing patterns exactly: routes → controllers → services → repositories.
- All translation keys use dot-notation: `t('header.title')`.
- Swedish (`sv`) is the default and fallback language.
- Both `sv/` and `en/` JSON files must have identical key structure.

---

### Task 1: Add `language` field to UserProfile (backend)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260624000000_add_language_to_user_profile/migration.sql`
- Modify: `server/src/modules/profile/profile.schemas.ts`
- Modify: `server/src/modules/profile/profile.repository.ts`
- Modify: `server/src/modules/profile/profile.service.ts`

**Interfaces:**
- Produces: `profile.language: string` in `GET /api/profile` response and `PUT /api/profile` accepts `language: 'sv' | 'en'`

- [ ] **Step 1: Add field to Prisma schema**

In `prisma/schema.prisma`, find the `UserProfile` model (line ~273) and add `language` after `landingTargetId`:

```prisma
  landingTargetId   String?
  language          String   @default("sv")
  createdAt         DateTime @default(now())
```

- [ ] **Step 2: Create migration file**

Create `prisma/migrations/20260624000000_add_language_to_user_profile/migration.sql`:

```sql
ALTER TABLE "user_profiles" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'sv';
```

- [ ] **Step 3: Run migration**

```bash
cd tool-inventory-system
npx prisma migrate deploy
```

Expected: `1 migration applied`

- [ ] **Step 4: Extend Zod schema**

In `server/src/modules/profile/profile.schemas.ts`, add `language` to `updateProfileSchema`:

```ts
export const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    firstName: z.string().min(1).max(80).optional(),
    lastName: z.string().min(1).max(80).optional(),
    phoneNumber: z.string().max(30).nullable().optional(),
    landingType: z.enum(["page", "group", "table"]).nullable().optional(),
    landingPath: z.enum(LANDING_PAGE_ROUTES).nullable().optional(),
    landingTargetId: z.string().cuid().nullable().optional(),
    language: z.enum(["sv", "en"]).optional(),
  })
  // ... keep existing .refine() calls unchanged
```

- [ ] **Step 5: Add `language` to repository select and write types**

In `server/src/modules/profile/profile.repository.ts`:

```ts
const profileFieldSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  profilePictureUrl: true,
  landingType: true,
  landingPath: true,
  landingTargetId: true,
  language: true,          // ADD THIS LINE
} as const;

export type ProfileWriteData = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  landingType?: string | null;
  landingPath?: string | null;
  landingTargetId?: string | null;
  language?: string;       // ADD THIS LINE
};
```

Also in `upsertUserProfile`, inside the `prisma.$transaction` create branch, add `language` to the `create` data object:

```ts
await tx.userProfile.create({
  data: {
    userId,
    firstName: profileFields.firstName ?? "",
    lastName: profileFields.lastName ?? "",
    phoneNumber: profileFields.phoneNumber ?? null,
    landingType: profileFields.landingType ?? null,
    landingPath: profileFields.landingPath ?? null,
    landingTargetId: profileFields.landingTargetId ?? null,
    language: profileFields.language ?? "sv",   // ADD THIS LINE
  },
});
```

- [ ] **Step 6: Expose `language` in `serializeProfile`**

In `server/src/modules/profile/profile.service.ts`, in `serializeProfile`, the `profile` spread already includes all `profileFieldSelect` fields — so `language` is automatically included once it's in the select. Verify the return type includes it:

Find the `ProfileRecord` type and add `language`:

```ts
type ProfileRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
    landingType: string | null;
    landingPath: string | null;
    landingTargetId: string | null;
    language: string;        // ADD THIS LINE
  } | null;
};
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260624000000_add_language_to_user_profile/migration.sql server/src/modules/profile/profile.schemas.ts server/src/modules/profile/profile.repository.ts server/src/modules/profile/profile.service.ts
git commit -m "feat: add language field to UserProfile for i18n preference"
```

---

### Task 2: Install i18next and create i18n.ts

**Files:**
- Modify: `client/package.json`
- Create: `client/src/i18n/i18n.ts`

**Interfaces:**
- Produces: `i18next` instance importable as `import i18n from '../i18n/i18n'` and `useTranslation` from `react-i18next`

- [ ] **Step 1: Install packages**

```bash
cd tool-inventory-system/client
npm install i18next react-i18next
```

Expected: both appear in `package.json` dependencies.

- [ ] **Step 2: Create `client/src/i18n/i18n.ts`**

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import commonSv from "./locales/sv/common.json";
import navigationSv from "./locales/sv/navigation.json";
import authSv from "./locales/sv/auth.json";
import dashboardSv from "./locales/sv/dashboard.json";
import inventorySv from "./locales/sv/inventory.json";
import toolsSv from "./locales/sv/tools.json";
import machinesSv from "./locales/sv/machines.json";
import locationsSv from "./locales/sv/locations.json";
import warehousesSv from "./locales/sv/warehouses.json";
import importSv from "./locales/sv/import.json";
import adminSv from "./locales/sv/admin.json";
import profileSv from "./locales/sv/profile.json";
import usedInSv from "./locales/sv/usedIn.json";
import takenSv from "./locales/sv/taken.json";

import commonEn from "./locales/en/common.json";
import navigationEn from "./locales/en/navigation.json";
import authEn from "./locales/en/auth.json";
import dashboardEn from "./locales/en/dashboard.json";
import inventoryEn from "./locales/en/inventory.json";
import toolsEn from "./locales/en/tools.json";
import machinesEn from "./locales/en/machines.json";
import locationsEn from "./locales/en/locations.json";
import warehousesEn from "./locales/en/warehouses.json";
import importEn from "./locales/en/import.json";
import adminEn from "./locales/en/admin.json";
import profileEn from "./locales/en/profile.json";
import usedInEn from "./locales/en/usedIn.json";
import takenEn from "./locales/en/taken.json";

void i18n.use(initReactI18next).init({
  lng: "sv",
  fallbackLng: "sv",
  resources: {
    sv: {
      common: commonSv,
      navigation: navigationSv,
      auth: authSv,
      dashboard: dashboardSv,
      inventory: inventorySv,
      tools: toolsSv,
      machines: machinesSv,
      locations: locationsSv,
      warehouses: warehousesSv,
      import: importSv,
      admin: adminSv,
      profile: profileSv,
      usedIn: usedInSv,
      taken: takenSv,
    },
    en: {
      common: commonEn,
      navigation: navigationEn,
      auth: authEn,
      dashboard: dashboardEn,
      inventory: inventoryEn,
      tools: toolsEn,
      machines: machinesEn,
      locations: locationsEn,
      warehouses: warehousesEn,
      import: importEn,
      admin: adminEn,
      profile: profileEn,
      usedIn: usedInEn,
      taken: takenEn,
    },
  },
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 3: Import i18n in `client/src/main.tsx`**

Add this import at the top of `client/src/main.tsx` (before the React import):

```ts
import "./i18n/i18n";
```

- [ ] **Step 4: Commit**

```bash
git add client/package.json client/src/i18n/i18n.ts client/src/main.tsx
git commit -m "feat: install i18next and create i18n initializer"
```

---

### Task 3: common + navigation translation files + layout components

**Files:**
- Create: `client/src/i18n/locales/sv/common.json`
- Create: `client/src/i18n/locales/en/common.json`
- Create: `client/src/i18n/locales/sv/navigation.json`
- Create: `client/src/i18n/locales/en/navigation.json`
- Modify: `client/src/components/layout/Sidebar.tsx`
- Modify: `client/src/components/layout/Topbar.tsx`
- Modify: `client/src/app/providers.tsx`

**Interfaces:**
- Produces: `t('common:save')`, `t('navigation:dashboard')` etc. usable in all components

- [ ] **Step 1: Create `client/src/i18n/locales/sv/common.json`**

```json
{
  "save": "Spara",
  "cancel": "Avbryt",
  "delete": "Ta bort",
  "edit": "Redigera",
  "search": "Sök",
  "close": "Stäng",
  "add": "Lägg till",
  "back": "Tillbaka",
  "confirm": "Bekräfta",
  "yes": "Ja",
  "no": "Nej",
  "loading": "Laddar...",
  "error": "Fel",
  "success": "Klart",
  "return": "Återlämna",
  "archive": "Arkivera",
  "restore": "Återställ",
  "remove": "Ta bort",
  "reset": "Återställ",
  "create": "Skapa",
  "update": "Uppdatera",
  "view": "Visa",
  "actions": "Åtgärder",
  "optional": "Valfritt",
  "required": "Obligatoriskt",
  "name": "Namn",
  "description": "Beskrivning",
  "status": "Status",
  "date": "Datum",
  "quantity": "Antal",
  "noResults": "Inga resultat",
  "loadingRecords": "Laddar poster",
  "records_one": "{{count}} post",
  "records_other": "{{count}} poster",
  "confirmDelete": "Ta bort detta?",
  "actionFailed": "Åtgärden misslyckades",
  "couldNotLoad": "Kunde inte ladda"
}
```

- [ ] **Step 2: Create `client/src/i18n/locales/en/common.json`**

```json
{
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete",
  "edit": "Edit",
  "search": "Search",
  "close": "Close",
  "add": "Add",
  "back": "Back",
  "confirm": "Confirm",
  "yes": "Yes",
  "no": "No",
  "loading": "Loading...",
  "error": "Error",
  "success": "Success",
  "return": "Return",
  "archive": "Archive",
  "restore": "Restore",
  "remove": "Remove",
  "reset": "Reset",
  "create": "Create",
  "update": "Update",
  "view": "View",
  "actions": "Actions",
  "optional": "Optional",
  "required": "Required",
  "name": "Name",
  "description": "Description",
  "status": "Status",
  "date": "Date",
  "quantity": "Quantity",
  "noResults": "No results",
  "loadingRecords": "Loading records",
  "records_one": "{{count}} record",
  "records_other": "{{count}} records",
  "confirmDelete": "Remove this?",
  "actionFailed": "Action failed",
  "couldNotLoad": "Could not load"
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/sv/navigation.json`**

```json
{
  "appName": "Verktygslager",
  "appSubtitle": "Internt system",
  "dashboard": "Instrumentpanel",
  "inventory": "Inventarier",
  "usedIn": "Används i",
  "takenItems": "Uttagna artiklar",
  "warehouses": "Lager",
  "locations": "Platser",
  "import": "Importera",
  "users": "Användare",
  "settings": "Inställningar",
  "profile": "Profil",
  "closeNavigation": "Stäng navigation",
  "openNavigation": "Öppna navigation",
  "mainNavigation": "Huvudnavigation",
  "signOut": "Logga ut"
}
```

- [ ] **Step 4: Create `client/src/i18n/locales/en/navigation.json`**

```json
{
  "appName": "Tool Inventory",
  "appSubtitle": "Internal system",
  "dashboard": "Dashboard",
  "inventory": "Inventory",
  "usedIn": "Used In",
  "takenItems": "Taken Items",
  "warehouses": "Warehouses",
  "locations": "Locations",
  "import": "Import",
  "users": "Users",
  "settings": "Settings",
  "profile": "Profile",
  "closeNavigation": "Close navigation",
  "openNavigation": "Open navigation",
  "mainNavigation": "Main navigation",
  "signOut": "Sign out"
}
```

- [ ] **Step 5: Update `client/src/components/layout/Sidebar.tsx`**

Replace the entire file content:

```tsx
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
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { t } = useTranslation("navigation");

  const primaryItems = [
    { label: t("dashboard"), href: "/dashboard", icon: BarChart3 },
    { label: t("inventory"), href: "/inventory", icon: Boxes },
    { label: t("usedIn"), href: "/used-in", icon: Boxes },
    { label: t("takenItems"), href: "/taken-items", icon: PackageMinus },
    { label: t("warehouses"), href: "/warehouses", icon: Warehouse },
    { label: t("locations"), href: "/locations", icon: MapPinned },
    { label: t("import"), href: "/import", icon: FileSpreadsheet, adminOnly: true },
    { label: t("users"), href: "/admin/users", icon: Users, adminOnly: true },
    { label: t("settings"), href: "/admin/settings", icon: Settings, adminOnly: true },
  ];

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
            <div className="text-lg font-semibold text-white">{t("appName")}</div>
            <div className="text-sm text-slate-400">{t("appSubtitle")}</div>
          </div>
          <button
            aria-label={t("closeNavigation")}
            className="rounded-md border border-line p-1.5 text-slate-400 hover:text-white lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col justify-between space-y-6" aria-label={t("mainNavigation")}>
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
              {user?.name || t("profile")}
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
}
```

- [ ] **Step 6: Update `client/src/components/layout/Topbar.tsx`**

```tsx
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { logout, user } = useAuth();
  const { t } = useTranslation("navigation");

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-line bg-slate-950/70 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          aria-label={t("openNavigation")}
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
        title={t("signOut")}
        type="button"
      >
        <LogOut aria-hidden="true" size={17} />
      </button>
    </header>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add client/src/i18n/locales/ client/src/components/layout/Sidebar.tsx client/src/components/layout/Topbar.tsx
git commit -m "feat: add common + navigation translations, update layout components"
```

---

### Task 4: Wire up I18nextProvider and auth-context language switch

**Files:**
- Modify: `client/src/app/providers.tsx`
- Modify: `client/src/app/auth-context.tsx`
- Modify: `client/src/types/auth.ts`
- Modify: `client/src/services/profile.service.ts`

**Interfaces:**
- Produces: Auth context applies `i18next.changeLanguage(user.language)` on every user load. Frontend `ProfileData.profile.language` is typed.

- [ ] **Step 1: Add `language` to `AuthUser` type**

In `client/src/types/auth.ts`, add `language` to the nested profile object:

```ts
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profile?: {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
    language: string;
  } | null;
  landingResolvedPath?: string;
};
```

- [ ] **Step 2: Add `language` to client `ProfileData`**

In `client/src/services/profile.service.ts`, add `language` to the nested `profile` type and `ProfileUpdateInput`:

```ts
export type ProfileData = {
  id: string;
  email: string;
  name: string;
  role: string;
  landingResolvedPath: string;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
    landingType: LandingType | null;
    landingPath: string | null;
    landingTargetId: string | null;
    language: string;        // ADD
  } | null;
};

export type ProfileUpdateInput = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  landingType?: LandingType | null;
  landingPath?: string | null;
  landingTargetId?: string | null;
  language?: "sv" | "en";  // ADD
};
```

- [ ] **Step 3: Update `client/src/app/auth-context.tsx` to apply language on load**

```tsx
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import i18n from "../i18n/i18n";
import {
  currentUserRequest,
  loginRequest,
  logoutRequest,
} from "../services/auth.service";
import type { AuthUser } from "../types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyLanguage = useCallback((loadedUser: AuthUser | null) => {
    const lang = loadedUser?.profile?.language ?? "sv";
    void i18n.changeLanguage(lang);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const result = await currentUserRequest();
      setUser(result.user);
      applyLanguage(result.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyLanguage]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    setUser(result.user);
    applyLanguage(result.user);
  }, [applyLanguage]);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    void i18n.changeLanguage("sv");
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshUser }),
    [user, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/types/auth.ts client/src/services/profile.service.ts client/src/app/auth-context.tsx
git commit -m "feat: apply user language preference from profile on login and page load"
```

---

### Task 5: auth namespace + auth pages

**Files:**
- Create: `client/src/i18n/locales/sv/auth.json`
- Create: `client/src/i18n/locales/en/auth.json`
- Modify: `client/src/pages/LoginPage.tsx`
- Modify: `client/src/pages/ForgotPasswordPage.tsx`
- Modify: `client/src/pages/ResetPasswordPage.tsx`
- Modify: `client/src/pages/AcceptInvitePage.tsx`

- [ ] **Step 1: Create `client/src/i18n/locales/sv/auth.json`**

```json
{
  "signIn": {
    "title": "Logga in",
    "subtitle": "Verktygsinventariesystem",
    "email": "E-post",
    "password": "Lösenord",
    "forgotPassword": "Glömt lösenord?",
    "submitting": "Loggar in...",
    "submit": "Logga in",
    "error": { "loginFailed": "Inloggning misslyckades" }
  },
  "forgotPassword": {
    "title": "Återställ lösenord",
    "subtitle": "Begär en säker återställningslänk via e-post.",
    "email": "E-post",
    "submitting": "Skickar...",
    "submit": "Skicka återställningslänk",
    "backToSignIn": "Tillbaka till inloggning",
    "error": { "requestFailed": "Begäran misslyckades" }
  },
  "resetPassword": {
    "title": "Välj ett nytt lösenord",
    "subtitle": "Återställningslänken kan endast användas en gång.",
    "newPassword": "Nytt lösenord",
    "confirmPassword": "Bekräfta lösenord",
    "submitting": "Uppdaterar...",
    "submit": "Uppdatera lösenord",
    "backToSignIn": "Tillbaka till inloggning",
    "error": {
      "tokenMissing": "Token för lösenordsåterställning saknas.",
      "passwordMismatch": "Lösenorden matchar inte.",
      "resetFailed": "Lösenordsåterställning misslyckades"
    }
  },
  "acceptInvite": {
    "title": "Acceptera inbjudan",
    "subtitle": "Ange ditt lösenord för att fortsätta.",
    "firstName": "Förnamn",
    "lastName": "Efternamn",
    "phoneNumber": "Telefonnummer",
    "password": "Lösenord",
    "confirmPassword": "Bekräfta lösenord",
    "submitting": "Skapar konto...",
    "submit": "Skapa konto",
    "changePhoto": "Byt foto",
    "addPhoto": "Lägg till foto",
    "photoHint": "Valfritt · PNG, JPG, max 3 MB",
    "error": {
      "invalidImage": "Välj en bildfil.",
      "imageTooLarge": "Bilden måste vara 3 MB eller mindre.",
      "tokenMissing": "Inbjudningstoken saknas.",
      "passwordMismatch": "Lösenorden matchar inte.",
      "invitationFailed": "Inbjudan misslyckades"
    }
  }
}
```

- [ ] **Step 2: Create `client/src/i18n/locales/en/auth.json`**

```json
{
  "signIn": {
    "title": "Sign in",
    "subtitle": "Tool Inventory System",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "submitting": "Signing in...",
    "submit": "Sign in",
    "error": { "loginFailed": "Login failed" }
  },
  "forgotPassword": {
    "title": "Reset password",
    "subtitle": "Request a secure reset link by email.",
    "email": "Email",
    "submitting": "Sending...",
    "submit": "Send reset link",
    "backToSignIn": "Back to sign in",
    "error": { "requestFailed": "Request failed" }
  },
  "resetPassword": {
    "title": "Choose a new password",
    "subtitle": "The reset link can only be used once.",
    "newPassword": "New password",
    "confirmPassword": "Confirm password",
    "submitting": "Updating...",
    "submit": "Update password",
    "backToSignIn": "Back to sign in",
    "error": {
      "tokenMissing": "Password reset token is missing.",
      "passwordMismatch": "Passwords do not match.",
      "resetFailed": "Password reset failed"
    }
  },
  "acceptInvite": {
    "title": "Accept invitation",
    "subtitle": "Set your password to continue.",
    "firstName": "First name",
    "lastName": "Last name",
    "phoneNumber": "Phone number",
    "password": "Password",
    "confirmPassword": "Confirm password",
    "submitting": "Creating account...",
    "submit": "Create account",
    "changePhoto": "Change photo",
    "addPhoto": "Add photo",
    "photoHint": "Optional · PNG, JPG, max 3 MB",
    "error": {
      "invalidImage": "Please choose an image file.",
      "imageTooLarge": "Image must be 3 MB or smaller.",
      "tokenMissing": "Invitation token is missing.",
      "passwordMismatch": "Passwords do not match.",
      "invitationFailed": "Invitation failed"
    }
  }
}
```

- [ ] **Step 3: Update `client/src/pages/LoginPage.tsx`**

Add `const { t } = useTranslation("auth");` inside the component and replace all strings:

```tsx
import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login, user } = useAuth();
  const { t } = useTranslation("auth");
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = location.state as { from?: { pathname?: string } } | null;
  const redirectTo = state?.from?.pathname ?? "/";

  if (user) return <Navigate replace to={redirectTo} />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : t("signIn.error.loginFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-7 shadow-industrial backdrop-blur">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
            <LockKeyhole aria-hidden="true" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{t("signIn.title")}</h1>
            <p className="text-sm text-slate-400">{t("signIn.subtitle")}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">{t("signIn.email")}</span>
            <input
              className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center justify-between text-sm font-medium text-slate-300">
              {t("signIn.password")}
              <Link className="text-xs text-accent hover:underline" to="/forgot-password">
                {t("signIn.forgotPassword")}
              </Link>
            </span>
            <input
              className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? t("signIn.submitting") : t("signIn.submit")}
          </button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Update `client/src/pages/ForgotPasswordPage.tsx`**

```tsx
import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { forgotPasswordRequest } from "../services/auth.service";

export function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await forgotPasswordRequest(email);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("forgotPassword.error.requestFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-7 shadow-industrial">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
            <KeyRound aria-hidden="true" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{t("forgotPassword.title")}</h1>
            <p className="text-sm text-slate-400">{t("forgotPassword.subtitle")}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-300">{t("forgotPassword.email")}</span>
            <input
              autoComplete="email"
              className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          {message ? <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
          </button>
        </form>

        <Link className="mt-5 block text-center text-sm text-slate-300 hover:text-white" to="/login">
          {t("forgotPassword.backToSignIn")}
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 5: Update `client/src/pages/ResetPasswordPage.tsx`**

```tsx
import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPasswordRequest } from "../services/auth.service";

export function ResetPasswordPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (!token) return setError(t("resetPassword.error.tokenMissing"));
    if (password !== confirmPassword) return setError(t("resetPassword.error.passwordMismatch"));
    setIsSubmitting(true);
    try {
      const result = await resetPasswordRequest(token, password);
      setMessage(result.message);
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("resetPassword.error.resetFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-7 shadow-industrial">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
            <ShieldCheck aria-hidden="true" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{t("resetPassword.title")}</h1>
            <p className="text-sm text-slate-400">{t("resetPassword.subtitle")}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <PasswordField label={t("resetPassword.newPassword")} onChange={setPassword} value={password} />
          <PasswordField label={t("resetPassword.confirmPassword")} onChange={setConfirmPassword} value={confirmPassword} />
          {message ? <p className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !token || Boolean(message)}
            type="submit"
          >
            {isSubmitting ? t("resetPassword.submitting") : t("resetPassword.submit")}
          </button>
        </form>

        <Link className="mt-5 block text-center text-sm text-slate-300 hover:text-white" to="/login">
          {t("resetPassword.backToSignIn")}
        </Link>
      </section>
    </main>
  );
}

function PasswordField(props: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-300">{props.label}</span>
      <input
        autoComplete="new-password"
        className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
        minLength={12}
        onChange={(event) => props.onChange(event.target.value)}
        required
        type="password"
        value={props.value}
      />
    </label>
  );
}
```

- [ ] **Step 6: Update `client/src/pages/AcceptInvitePage.tsx`**

Add `const { t } = useTranslation("auth");` at the top of `AcceptInvitePage`. Replace all string literals:

- `"Accept invitation"` → `{t("acceptInvite.title")}`
- `"Set your password to continue."` → `{t("acceptInvite.subtitle")}`
- `"Invitation token is missing."` (JSX) → `{t("acceptInvite.error.tokenMissing")}`
- Error: `"Invitation token is missing."` → `t("acceptInvite.error.tokenMissing")`
- Error: `"Passwords do not match."` → `t("acceptInvite.error.passwordMismatch")`
- Error: `"Invitation failed"` → `t("acceptInvite.error.invitationFailed")`
- Error: `"Please choose an image file."` → `t("acceptInvite.error.invalidImage")`
- Error: `"Image must be 3 MB or smaller."` → `t("acceptInvite.error.imageTooLarge")`
- `"Creating account..."` → `{t("acceptInvite.submitting")}`
- `"Create account"` → `{t("acceptInvite.submit")}`

Pass `t` into `AvatarChooser` via a prop `changePhotoLabel` and `addPhotoLabel`:

```tsx
<AvatarChooser
  addPhotoLabel={t("acceptInvite.addPhoto")}
  changePhotoLabel={t("acceptInvite.changePhoto")}
  onPick={() => fileRef.current?.click()}
  photoHint={t("acceptInvite.photoHint")}
  preview={photoPreview}
/>
```

Update `AvatarChooser` props to accept these strings:

```tsx
function AvatarChooser({ addPhotoLabel, changePhotoLabel, onPick, photoHint, preview }: {
  addPhotoLabel: string;
  changePhotoLabel: string;
  onPick: () => void;
  photoHint: string;
  preview: string | null;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {preview ? (
          <img alt="Profile" className="h-16 w-16 rounded-full border border-line object-cover" src={preview} />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-white/[0.06]">
            <User className="text-slate-400" size={26} />
          </div>
        )}
      </div>
      <div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent hover:text-accent"
          onClick={onPick}
          type="button"
        >
          <Camera size={15} /> {preview ? changePhotoLabel : addPhotoLabel}
        </button>
        <p className="mt-1 text-xs text-slate-500">{photoHint}</p>
      </div>
    </div>
  );
}
```

`TextInput` labels are passed as props from the parent which now passes `t(...)` values — no change needed to `TextInput` itself.

- [ ] **Step 7: Commit**

```bash
git add client/src/i18n/locales/sv/auth.json client/src/i18n/locales/en/auth.json client/src/pages/LoginPage.tsx client/src/pages/ForgotPasswordPage.tsx client/src/pages/ResetPasswordPage.tsx client/src/pages/AcceptInvitePage.tsx
git commit -m "feat: auth namespace translations, update all auth pages"
```

---

### Task 6: dashboard namespace + DashboardPage and dashboard components

**Files:**
- Create: `client/src/i18n/locales/sv/dashboard.json`
- Create: `client/src/i18n/locales/en/dashboard.json`
- Modify: `client/src/pages/DashboardPage.tsx`
- Modify: `client/src/components/dashboard/AdminSummaryWidget.tsx`
- Modify: `client/src/components/dashboard/DashboardHeader.tsx`
- Modify: `client/src/components/dashboard/ManagerTablesWidget.tsx`
- Modify: `client/src/components/dashboard/MetricCard.tsx`
- Modify: `client/src/components/dashboard/MyReportedIssuesWidget.tsx`
- Modify: `client/src/components/dashboard/RecentNotesWidget.tsx`
- Modify: `client/src/components/dashboard/StatusPanel.tsx`
- Modify: `client/src/components/dashboard/TakenItemsWidget.tsx`
- Modify: `client/src/components/dashboard/UrgentIssuesWidget.tsx`

- [ ] **Step 1: Read each dashboard component**

Before writing translations, read every dashboard component file listed above. Look for every hardcoded user-visible string (labels, headings, placeholders, button text, empty-state messages).

Command to read in sequence:
```bash
# Read each file before Step 2
cat client/src/components/dashboard/AdminSummaryWidget.tsx
cat client/src/components/dashboard/DashboardHeader.tsx
cat client/src/components/dashboard/ManagerTablesWidget.tsx
cat client/src/components/dashboard/MetricCard.tsx
cat client/src/components/dashboard/MyReportedIssuesWidget.tsx
cat client/src/components/dashboard/RecentNotesWidget.tsx
cat client/src/components/dashboard/StatusPanel.tsx
cat client/src/components/dashboard/TakenItemsWidget.tsx
cat client/src/components/dashboard/UrgentIssuesWidget.tsx
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/dashboard.json`**

Start from this base and **add every string found in Step 1**:

```json
{
  "sectionLabel": "Översikt",
  "title": "Instrumentpanel",
  "scanQr": "Skanna QR",
  "adminSummary": {
    "title": "Systemöversikt"
  },
  "urgentIssues": {
    "title": "Brådskande ärenden",
    "empty": "Inga brådskande ärenden."
  },
  "recentNotes": {
    "title": "Senaste anteckningar",
    "empty": "Inga anteckningar ännu."
  },
  "takenItems": {
    "title": "Uttagna artiklar",
    "empty": "Inga artiklar uttagna."
  },
  "myReportedIssues": {
    "title": "Mina rapporterade ärenden",
    "empty": "Du har inga rapporterade ärenden."
  },
  "managerTables": {
    "title": "Inventarietabeller",
    "empty": "Inga tabeller hittades."
  },
  "status": {
    "title": "Systemstatus",
    "latestImport": "Senaste import",
    "latestBackup": "Senaste säkerhetskopia",
    "weeklyEmail": "Veckoutskick"
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/dashboard.json`**

Mirror of `sv` with English values:

```json
{
  "sectionLabel": "Overview",
  "title": "Dashboard",
  "scanQr": "Scan QR",
  "adminSummary": {
    "title": "System Overview"
  },
  "urgentIssues": {
    "title": "Urgent Issues",
    "empty": "No urgent issues."
  },
  "recentNotes": {
    "title": "Recent Notes",
    "empty": "No notes yet."
  },
  "takenItems": {
    "title": "Taken Items",
    "empty": "No items taken out."
  },
  "myReportedIssues": {
    "title": "My Reported Issues",
    "empty": "You have no reported issues."
  },
  "managerTables": {
    "title": "Inventory Tables",
    "empty": "No tables found."
  },
  "status": {
    "title": "System Status",
    "latestImport": "Latest import",
    "latestBackup": "Latest backup",
    "weeklyEmail": "Weekly email"
  }
}
```

- [ ] **Step 4: Update `client/src/pages/DashboardPage.tsx`**

Add `const { t } = useTranslation("dashboard");` inside `DashboardPage`. Replace:
- `"Overview"` → `{t("sectionLabel")}`
- `"Dashboard"` → `{t("title")}`
- `"Scan QR"` → `{t("scanQr")}`

- [ ] **Step 5: Update each dashboard component**

For each component file listed above, add `const { t } = useTranslation("dashboard");` and replace every hardcoded string with the matching key from `dashboard.json`. Add new keys to both JSON files if a string was missed in Step 2.

- [ ] **Step 6: Commit**

```bash
git add client/src/i18n/locales/sv/dashboard.json client/src/i18n/locales/en/dashboard.json client/src/pages/DashboardPage.tsx client/src/components/dashboard/
git commit -m "feat: dashboard namespace translations, update DashboardPage and widgets"
```

---

### Task 7: tools namespace + ToolsPage and tool components

**Files:**
- Create: `client/src/i18n/locales/sv/tools.json`
- Create: `client/src/i18n/locales/en/tools.json`
- Modify: `client/src/pages/ToolsPage.tsx`
- Modify: `client/src/components/tools/ToolDetailsDrawer.tsx`
- Modify: `client/src/components/tools/ToolFormModal.tsx`
- Modify: `client/src/components/tools/ToolPlacementPanel.tsx`
- Modify: `client/src/components/tools/ToolsPagination.tsx`
- Modify: `client/src/components/tools/ToolsTable.tsx`
- Modify: `client/src/components/tools/ToolsToolbar.tsx`
- Modify: `client/src/components/tools/PlacementBadge.tsx`

- [ ] **Step 1: Read all tool component files**

```bash
cat client/src/components/tools/ToolDetailsDrawer.tsx
cat client/src/components/tools/ToolFormModal.tsx
cat client/src/components/tools/ToolPlacementPanel.tsx
cat client/src/components/tools/ToolsPagination.tsx
cat client/src/components/tools/ToolsTable.tsx
cat client/src/components/tools/ToolsToolbar.tsx
cat client/src/components/tools/PlacementBadge.tsx
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/tools.json`**

Start from this base and add every string found in Step 1:

```json
{
  "sectionLabel": "Inventarier",
  "title": "Verktyg",
  "export": {
    "label": "Exportera Excel",
    "exporting": "Exporterar..."
  },
  "records": "{{count}} poster",
  "loadingRecords": "Laddar poster",
  "confirmRemove": "Ta bort det här verktyget?",
  "actionFailed": "Åtgärden misslyckades",
  "toolbar": {
    "addTool": "Lägg till verktyg",
    "search": "Sök verktyg...",
    "filterType": "Typ",
    "filterManufacturer": "Tillverkare",
    "filterLocation": "Plats",
    "filterMachine": "Maskin",
    "filterPlacement": "Placering",
    "filterStatus": "Status",
    "showArchived": "Visa arkiverade",
    "reset": "Återställ filter"
  },
  "table": {
    "name": "Namn",
    "type": "Typ",
    "manufacturer": "Tillverkare",
    "location": "Plats",
    "machine": "Maskin",
    "quantity": "Antal",
    "status": "Status",
    "updated": "Uppdaterad",
    "actions": "Åtgärder",
    "noTools": "Inga verktyg hittades.",
    "loading": "Laddar verktyg..."
  },
  "form": {
    "createTitle": "Lägg till verktyg",
    "editTitle": "Redigera verktyg",
    "name": "Namn",
    "toolType": "Verktygtyp",
    "manufacturer": "Tillverkare",
    "quantity": "Antal",
    "status": "Status",
    "notes": "Anteckningar",
    "submit": "Spara",
    "cancel": "Avbryt"
  },
  "details": {
    "title": "Verktygsinformation",
    "edit": "Redigera",
    "archive": "Arkivera",
    "restore": "Återställ",
    "delete": "Ta bort",
    "close": "Stäng",
    "placement": "Placering",
    "history": "Historik"
  },
  "placement": {
    "title": "Placering",
    "assignLocation": "Tilldela plats",
    "assignMachine": "Tilldela maskin",
    "unassigned": "Ej tilldelad"
  },
  "pagination": {
    "previous": "Föregående",
    "next": "Nästa",
    "of": "av"
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/tools.json`**

```json
{
  "sectionLabel": "Inventory",
  "title": "Tools",
  "export": {
    "label": "Export Excel",
    "exporting": "Exporting..."
  },
  "records": "{{count}} records",
  "loadingRecords": "Loading records",
  "confirmRemove": "Remove this tool?",
  "actionFailed": "Action failed",
  "toolbar": {
    "addTool": "Add tool",
    "search": "Search tools...",
    "filterType": "Type",
    "filterManufacturer": "Manufacturer",
    "filterLocation": "Location",
    "filterMachine": "Machine",
    "filterPlacement": "Placement",
    "filterStatus": "Status",
    "showArchived": "Show archived",
    "reset": "Reset filters"
  },
  "table": {
    "name": "Name",
    "type": "Type",
    "manufacturer": "Manufacturer",
    "location": "Location",
    "machine": "Machine",
    "quantity": "Quantity",
    "status": "Status",
    "updated": "Updated",
    "actions": "Actions",
    "noTools": "No tools found.",
    "loading": "Loading tools..."
  },
  "form": {
    "createTitle": "Add tool",
    "editTitle": "Edit tool",
    "name": "Name",
    "toolType": "Tool type",
    "manufacturer": "Manufacturer",
    "quantity": "Quantity",
    "status": "Status",
    "notes": "Notes",
    "submit": "Save",
    "cancel": "Cancel"
  },
  "details": {
    "title": "Tool details",
    "edit": "Edit",
    "archive": "Archive",
    "restore": "Restore",
    "delete": "Delete",
    "close": "Close",
    "placement": "Placement",
    "history": "History"
  },
  "placement": {
    "title": "Placement",
    "assignLocation": "Assign location",
    "assignMachine": "Assign machine",
    "unassigned": "Unassigned"
  },
  "pagination": {
    "previous": "Previous",
    "next": "Next",
    "of": "of"
  }
}
```

- [ ] **Step 4: Update ToolsPage and all tool components**

For each file: add `const { t } = useTranslation("tools");` and replace every hardcoded string with its key. Add missing keys to both JSON files as you go. In `ToolsPage.tsx`:
- `"Inventory"` → `{t("sectionLabel")}`
- `"Tools"` → `{t("title")}`
- `"Exporting..."` → `{t("export.exporting")}`
- `"Export Excel"` → `{t("export.label")}`
- `` `${tools.data.total} records` `` → `{t("records", { count: tools.data.total })}`
- `"Loading records"` → `{t("loadingRecords")}`
- `window.confirm("Remove this tool?")` → `window.confirm(t("confirmRemove"))`
- `"Action failed"` → `t("actionFailed")`

- [ ] **Step 5: Commit**

```bash
git add client/src/i18n/locales/sv/tools.json client/src/i18n/locales/en/tools.json client/src/pages/ToolsPage.tsx client/src/components/tools/
git commit -m "feat: tools namespace translations, update ToolsPage and tool components"
```

---

### Task 8: machines namespace + MachinesPage and machine components

**Files:**
- Create: `client/src/i18n/locales/sv/machines.json`
- Create: `client/src/i18n/locales/en/machines.json`
- Modify: `client/src/pages/MachinesPage.tsx`
- Modify: `client/src/pages/MachineDetailsPage.tsx`
- Modify: `client/src/components/machines/MachineCards.tsx`
- Modify: `client/src/components/machines/MachineInventoryTable.tsx`
- Modify: `client/src/components/machines/MachineToolLinkModal.tsx`

- [ ] **Step 1: Read machine component files**

```bash
cat client/src/pages/MachineDetailsPage.tsx
cat client/src/components/machines/MachineCards.tsx
cat client/src/components/machines/MachineInventoryTable.tsx
cat client/src/components/machines/MachineToolLinkModal.tsx
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/machines.json`**

Start from this base and add every string found in Step 1:

```json
{
  "sectionLabel": "Maskiner",
  "title": "Maskiner",
  "count": "{{count}} maskiner",
  "form": {
    "namePlaceholder": "Maskinnamn",
    "descriptionPlaceholder": "Beskrivning valfritt",
    "submit": "Lägg till maskin"
  },
  "error": {
    "createFailed": "Maskinen kunde inte läggas till",
    "deleteFailed": "Maskinen kunde inte tas bort"
  },
  "confirmDelete": "Ta bort {{name}}? Inventarieverktyg stannar i databasen men tas bort från den här maskinen.",
  "cards": {
    "viewDetails": "Visa detaljer",
    "delete": "Ta bort",
    "noMachines": "Inga maskiner hittades.",
    "loading": "Laddar maskiner..."
  },
  "details": {
    "sectionLabel": "Maskiner",
    "backToMachines": "Tillbaka till maskiner",
    "tools": "Verktyg",
    "addTool": "Lägg till verktyg",
    "noTools": "Inga verktyg tilldelade."
  },
  "linkModal": {
    "title": "Lägg till verktyg i maskin",
    "search": "Sök verktyg...",
    "quantity": "Antal",
    "submit": "Lägg till",
    "cancel": "Avbryt"
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/machines.json`**

```json
{
  "sectionLabel": "Machines",
  "title": "Machines",
  "count": "{{count}} machines",
  "form": {
    "namePlaceholder": "Machine name",
    "descriptionPlaceholder": "Description optional",
    "submit": "Add machine"
  },
  "error": {
    "createFailed": "Machine could not be added",
    "deleteFailed": "Machine could not be removed"
  },
  "confirmDelete": "Remove {{name}}? Inventory tools will stay in the database but will be unassigned from this machine.",
  "cards": {
    "viewDetails": "View details",
    "delete": "Delete",
    "noMachines": "No machines found.",
    "loading": "Loading machines..."
  },
  "details": {
    "sectionLabel": "Machines",
    "backToMachines": "Back to machines",
    "tools": "Tools",
    "addTool": "Add tool",
    "noTools": "No tools assigned."
  },
  "linkModal": {
    "title": "Add tool to machine",
    "search": "Search tools...",
    "quantity": "Quantity",
    "submit": "Add",
    "cancel": "Cancel"
  }
}
```

- [ ] **Step 4: Update MachinesPage and machine components**

In `MachinesPage.tsx` replace:
- `"Machines"` (section label) → `{t("sectionLabel")}`
- `"Machines"` (h1) → `{t("title")}`
- `` `${machines.length} machines` `` → `{t("count", { count: machines.length })}`
- `"Machine name"` placeholder → `{t("form.namePlaceholder")}`
- `"Description optional"` placeholder → `{t("form.descriptionPlaceholder")}`
- `"Add machine"` → `{t("form.submit")}`
- `"Machine could not be added"` → `t("error.createFailed")`
- `"Machine could not be removed"` → `t("error.deleteFailed")`
- `` `Remove ${machine.name}? Inventory tools...` `` → `t("confirmDelete", { name: machine.name })`

Update remaining component files similarly.

- [ ] **Step 5: Commit**

```bash
git add client/src/i18n/locales/sv/machines.json client/src/i18n/locales/en/machines.json client/src/pages/MachinesPage.tsx client/src/pages/MachineDetailsPage.tsx client/src/components/machines/
git commit -m "feat: machines namespace translations, update machine pages and components"
```

---

### Task 9: locations namespace + location pages and components

**Files:**
- Create: `client/src/i18n/locales/sv/locations.json`
- Create: `client/src/i18n/locales/en/locations.json`
- Modify: `client/src/pages/LocationsPage.tsx`
- Modify: `client/src/pages/LocationMapPage.tsx`
- Modify: `client/src/components/locations/LocationsTable.tsx`
- Modify: `client/src/components/locations/LocationMapGrid.tsx`
- Modify: `client/src/components/locations/UnassignedToolsPanel.tsx`

- [ ] **Step 1: Read location component files**

```bash
cat client/src/pages/LocationMapPage.tsx
cat client/src/components/locations/LocationsTable.tsx
cat client/src/components/locations/LocationMapGrid.tsx
cat client/src/components/locations/UnassignedToolsPanel.tsx
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/locations.json`**

```json
{
  "sectionLabel": "Platser",
  "title": "Hylla och FACK",
  "mapView": "Kartvy",
  "search": "Sök hylla, FACK eller källblad...",
  "table": {
    "shelf": "Hylla",
    "compartment": "FACK",
    "sourceSheet": "Källblad",
    "toolCount": "Verktyg",
    "noLocations": "Inga platser hittades.",
    "loading": "Laddar platser..."
  },
  "unassigned": {
    "title": "Ej tilldelade verktyg",
    "empty": "Inga ej tilldelade verktyg.",
    "loading": "Laddar..."
  },
  "map": {
    "title": "Platsöversikt",
    "backToList": "Tillbaka till listan"
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/locations.json`**

```json
{
  "sectionLabel": "Locations",
  "title": "Shelf and FACK",
  "mapView": "Map view",
  "search": "Search shelf, FACK, or source sheet...",
  "table": {
    "shelf": "Shelf",
    "compartment": "FACK",
    "sourceSheet": "Source sheet",
    "toolCount": "Tools",
    "noLocations": "No locations found.",
    "loading": "Loading locations..."
  },
  "unassigned": {
    "title": "Unassigned tools",
    "empty": "No unassigned tools.",
    "loading": "Loading..."
  },
  "map": {
    "title": "Location overview",
    "backToList": "Back to list"
  }
}
```

- [ ] **Step 4: Update location pages and components**

Add `const { t } = useTranslation("locations");` to each file. In `LocationsPage.tsx`:
- `"Locations"` → `{t("sectionLabel")}`
- `"Shelf and FACK"` → `{t("title")}`
- `"Map view"` → `{t("mapView")}`
- `"Search shelf, FACK, or source sheet..."` → `{t("search")}`

- [ ] **Step 5: Commit**

```bash
git add client/src/i18n/locales/sv/locations.json client/src/i18n/locales/en/locations.json client/src/pages/LocationsPage.tsx client/src/pages/LocationMapPage.tsx client/src/components/locations/
git commit -m "feat: locations namespace translations, update location pages and components"
```

---

### Task 10: warehouses namespace + warehouse pages, components, and designer

**Files:**
- Create: `client/src/i18n/locales/sv/warehouses.json`
- Create: `client/src/i18n/locales/en/warehouses.json`
- Modify: `client/src/pages/WarehousesPage.tsx`
- Modify: `client/src/pages/WarehouseDetailsPage.tsx`
- Modify: `client/src/pages/WarehouseDesignPage.tsx`
- Modify: all files in `client/src/components/warehouses/`
- Modify: all files in `client/src/modules/warehouse-designer/components/`

- [ ] **Step 1: Read all warehouse component and designer files**

```bash
cat client/src/pages/WarehouseDetailsPage.tsx
cat client/src/pages/WarehouseDesignPage.tsx
# Then read each file in components/warehouses/ and modules/warehouse-designer/components/
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/warehouses.json`**

Start from this base and **add every string found in Step 1** before committing:

```json
{
  "sectionLabel": "Lager",
  "title": "Lagerlayouter",
  "subtitle": "Sparade lagerlayouter ansluter hyllor, platser och 3D-palettplacering till inventarierader.",
  "designNew": "Designa nytt lager",
  "empty": {
    "title": "Inga lagerlayouter ännu",
    "description": "Skapa en lagerlayout innan du ansluter hyllor och platser till inventariet."
  },
  "confirmArchive": "Arkivera den här lagerlayouten?",
  "confirmDelete": "Ta bort \"{{name}}\" permanent? Detta kan inte ångras.",
  "archiveControls": {
    "showArchived": "Visa arkiverade",
    "hideArchived": "Dölj arkiverade"
  },
  "card": {
    "viewDetails": "Visa detaljer",
    "design": "Designa",
    "archive": "Arkivera",
    "restore": "Återställ",
    "delete": "Ta bort"
  },
  "details": {
    "sectionLabel": "Lager",
    "shelves": "Hyllor",
    "slots": "Platser",
    "inventory": "Inventarie",
    "view3d": "3D-vy",
    "addShelf": "Lägg till hylla",
    "generateShelves": "Generera hyllor"
  },
  "designer": {
    "title": "Lagerdesigner",
    "save": "Spara",
    "saving": "Sparar...",
    "layers": "Lager",
    "objects": "Objekt",
    "inspector": "Inspektor",
    "tools": "Verktyg",
    "levels": "Nivåer",
    "addLevel": "Lägg till nivå",
    "issues": "Problem",
    "suggestions": "Förslag",
    "commandPalette": "Kommandopalett",
    "minimap": "Minimapp"
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/warehouses.json`**

```json
{
  "sectionLabel": "Warehouses",
  "title": "Warehouse layouts",
  "subtitle": "Saved warehouse layouts will connect shelves, slots, and 3D pallet placement to inventory rows.",
  "designNew": "Design new warehouse",
  "empty": {
    "title": "No warehouse layouts yet",
    "description": "Create a warehouse layout before connecting shelves and slots to inventory."
  },
  "confirmArchive": "Archive this warehouse layout?",
  "confirmDelete": "Permanently delete \"{{name}}\"? This cannot be undone.",
  "archiveControls": {
    "showArchived": "Show archived",
    "hideArchived": "Hide archived"
  },
  "card": {
    "viewDetails": "View details",
    "design": "Design",
    "archive": "Archive",
    "restore": "Restore",
    "delete": "Delete"
  },
  "details": {
    "sectionLabel": "Warehouses",
    "shelves": "Shelves",
    "slots": "Slots",
    "inventory": "Inventory",
    "view3d": "3D view",
    "addShelf": "Add shelf",
    "generateShelves": "Generate shelves"
  },
  "designer": {
    "title": "Warehouse Designer",
    "save": "Save",
    "saving": "Saving...",
    "layers": "Layers",
    "objects": "Objects",
    "inspector": "Inspector",
    "tools": "Tools",
    "levels": "Levels",
    "addLevel": "Add level",
    "issues": "Issues",
    "suggestions": "Suggestions",
    "commandPalette": "Command palette",
    "minimap": "Minimap"
  }
}
```

- [ ] **Step 4: Update `WarehousesPage.tsx`**

```tsx
const { t } = useTranslation("warehouses");
// Replace:
// "Warehouses" sectionLabel → {t("sectionLabel")}
// "Warehouse layouts" → {t("title")}
// subtitle text → {t("subtitle")}
// "Design new warehouse" → {t("designNew")}
// "No warehouse layouts yet" → {t("empty.title")}
// "Create a warehouse layout..." → {t("empty.description")}
// window.confirm("Archive this warehouse layout?") → window.confirm(t("confirmArchive"))
// window.confirm(`Permanently delete "${target.name}"?...`) → window.confirm(t("confirmDelete", { name: target.name }))
```

- [ ] **Step 5: Update all warehouse components and designer components**

Read each file in `client/src/components/warehouses/` and `client/src/modules/warehouse-designer/components/`. Add `const { t } = useTranslation("warehouses");` and replace every hardcoded string. Add missing keys to both JSON files.

- [ ] **Step 6: Commit**

```bash
git add client/src/i18n/locales/sv/warehouses.json client/src/i18n/locales/en/warehouses.json client/src/pages/WarehousesPage.tsx client/src/pages/WarehouseDetailsPage.tsx client/src/pages/WarehouseDesignPage.tsx client/src/components/warehouses/ client/src/modules/warehouse-designer/
git commit -m "feat: warehouses namespace translations, update warehouse pages and designer"
```

---

### Task 11: inventory namespace + inventory pages and structured-inventory components

**Files:**
- Create: `client/src/i18n/locales/sv/inventory.json`
- Create: `client/src/i18n/locales/en/inventory.json`
- Modify: `client/src/pages/InventoryPage.tsx`
- Modify: `client/src/pages/InventoryDetailsPage.tsx`
- Modify: `client/src/pages/StructuredInventoryGroupPage.tsx`
- Modify: `client/src/pages/StructuredInventoryTablePage.tsx`
- Modify: all files in `client/src/components/structured-inventory/`
- Modify: `client/src/components/inventory/DynamicInventoryTable.tsx`

- [ ] **Step 1: Read all inventory component files**

```bash
cat client/src/pages/InventoryDetailsPage.tsx
cat client/src/pages/StructuredInventoryGroupPage.tsx
cat client/src/pages/StructuredInventoryTablePage.tsx
# Then read each file in client/src/components/structured-inventory/
cat client/src/components/inventory/DynamicInventoryTable.tsx
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/inventory.json`**

Start from this base and **add every string found in Step 1**:

```json
{
  "sectionLabel": "Inventarier",
  "title": "Inventarieöversikt",
  "groups": "Grupper",
  "tables": "Tabeller",
  "confirmRemoveGroup": "Ta bort den här gruppen? Tabeller blir fristående.",
  "confirmRemoveTable": "Ta bort den här tabellen och dess rader?",
  "empty": {
    "title": "Inga inventarier ännu",
    "description": "Skapa en grupp eller tabell för att komma igång."
  },
  "create": {
    "groupLabel": "Ny grupp",
    "groupPlaceholder": "Gruppnamn",
    "tableLabel": "Ny tabell",
    "tablePlaceholder": "Tabellnamn",
    "submit": "Skapa"
  },
  "group": {
    "sectionLabel": "Inventariegrupp",
    "tables": "Tabeller",
    "addTable": "Lägg till tabell"
  },
  "table": {
    "sectionLabel": "Inventarietabell",
    "addRow": "Lägg till rad",
    "columns": "Kolumner",
    "search": "Sök...",
    "noRows": "Inga rader.",
    "loading": "Laddar...",
    "quantity": "Antal",
    "location": "Plats",
    "compartment": "FACK",
    "notes": "Anteckningar",
    "archive": "Arkivera",
    "restore": "Återställ",
    "delete": "Ta bort",
    "take": "Ta ut",
    "useIn": "Använd i",
    "history": "Historik"
  },
  "row": {
    "details": "Detaljer",
    "edit": "Redigera",
    "save": "Spara",
    "cancel": "Avbryt",
    "close": "Stäng",
    "duplicates": "Möjliga dubbletter",
    "urgentIssue": "Brådskande ärende",
    "lowStock": "Lågt lager"
  },
  "stats": {
    "totalItems": "Totalt antal artiklar",
    "totalValue": "Totalt värde",
    "lowStock": "Lågt lager",
    "taken": "Uttagna"
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/inventory.json`**

```json
{
  "sectionLabel": "Inventory",
  "title": "Inventory overview",
  "groups": "Groups",
  "tables": "Tables",
  "confirmRemoveGroup": "Remove this group? Tables will become standalone.",
  "confirmRemoveTable": "Remove this table and its rows?",
  "empty": {
    "title": "No inventory yet",
    "description": "Create a group or table to get started."
  },
  "create": {
    "groupLabel": "New group",
    "groupPlaceholder": "Group name",
    "tableLabel": "New table",
    "tablePlaceholder": "Table name",
    "submit": "Create"
  },
  "group": {
    "sectionLabel": "Inventory group",
    "tables": "Tables",
    "addTable": "Add table"
  },
  "table": {
    "sectionLabel": "Inventory table",
    "addRow": "Add row",
    "columns": "Columns",
    "search": "Search...",
    "noRows": "No rows.",
    "loading": "Loading...",
    "quantity": "Quantity",
    "location": "Location",
    "compartment": "FACK",
    "notes": "Notes",
    "archive": "Archive",
    "restore": "Restore",
    "delete": "Delete",
    "take": "Take",
    "useIn": "Use in",
    "history": "History"
  },
  "row": {
    "details": "Details",
    "edit": "Edit",
    "save": "Save",
    "cancel": "Cancel",
    "close": "Close",
    "duplicates": "Possible duplicates",
    "urgentIssue": "Urgent issue",
    "lowStock": "Low stock"
  },
  "stats": {
    "totalItems": "Total items",
    "totalValue": "Total value",
    "lowStock": "Low stock",
    "taken": "Taken"
  }
}
```

- [ ] **Step 4: Update `InventoryPage.tsx`**

```tsx
const { t } = useTranslation("inventory");
// Replace:
// "Groups" → {t("groups")}
// "Tables" → {t("tables")}
// window.confirm("Remove this group?...") → window.confirm(t("confirmRemoveGroup"))
// window.confirm("Remove this table and its rows?") → window.confirm(t("confirmRemoveTable"))
```

- [ ] **Step 5: Update all structured-inventory components**

Read each file in `client/src/components/structured-inventory/` and replace every hardcoded string using `useTranslation("inventory")`. Add any missing keys to both JSON files as you go.

- [ ] **Step 6: Commit**

```bash
git add client/src/i18n/locales/sv/inventory.json client/src/i18n/locales/en/inventory.json client/src/pages/InventoryPage.tsx client/src/pages/InventoryDetailsPage.tsx client/src/pages/StructuredInventoryGroupPage.tsx client/src/pages/StructuredInventoryTablePage.tsx client/src/components/structured-inventory/ client/src/components/inventory/
git commit -m "feat: inventory namespace translations, update inventory pages and components"
```

---

### Task 12: import namespace + ImportPage and import components

**Files:**
- Create: `client/src/i18n/locales/sv/import.json`
- Create: `client/src/i18n/locales/en/import.json`
- Modify: `client/src/pages/ImportPage.tsx`
- Modify: all files in `client/src/components/import/`
- Modify: all files in `client/src/components/structured-import/`

- [ ] **Step 1: Read all import files**

```bash
cat client/src/pages/ImportPage.tsx
# Then read each file in components/import/ and components/structured-import/
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/import.json`**

Start from this base and add every string found in Step 1:

```json
{
  "sectionLabel": "Importera",
  "title": "Importera Excel",
  "subtitle": "Ladda upp ett Excel-arbetsblad för att importera inventariedata.",
  "steps": {
    "upload": "Ladda upp",
    "selectSheet": "Välj blad",
    "mapColumns": "Mappa kolumner",
    "preview": "Förhandsgranska",
    "confirm": "Bekräfta",
    "result": "Resultat"
  },
  "upload": {
    "label": "Välj Excel-fil",
    "hint": "Stöder .xlsx och .xls",
    "submit": "Ladda upp",
    "uploading": "Laddar upp..."
  },
  "sheetSelection": {
    "title": "Välj blad att importera",
    "selectAll": "Välj alla",
    "deselectAll": "Avmarkera alla",
    "continue": "Fortsätt"
  },
  "columnMapping": {
    "title": "Mappa kolumner",
    "sourceColumn": "Källkolumn",
    "targetField": "Målfält",
    "skip": "Hoppa över",
    "continue": "Fortsätt"
  },
  "staging": {
    "title": "Förhandsgranska staging",
    "rows": "Rader",
    "warnings": "Varningar",
    "errors": "Fel",
    "ready": "Klara",
    "confirm": "Bekräfta import",
    "back": "Tillbaka"
  },
  "result": {
    "success": "Import klar",
    "imported": "{{count}} rader importerade",
    "errors": "{{count}} fel",
    "viewInventory": "Visa inventarier",
    "importMore": "Importera mer"
  },
  "issues": {
    "title": "Problem",
    "warning": "Varning",
    "error": "Fel"
  },
  "summary": {
    "total": "Totalt",
    "ready": "Klara",
    "warnings": "Varningar",
    "errors": "Fel"
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/import.json`**

```json
{
  "sectionLabel": "Import",
  "title": "Import Excel",
  "subtitle": "Upload an Excel workbook to import inventory data.",
  "steps": {
    "upload": "Upload",
    "selectSheet": "Select sheet",
    "mapColumns": "Map columns",
    "preview": "Preview",
    "confirm": "Confirm",
    "result": "Result"
  },
  "upload": {
    "label": "Choose Excel file",
    "hint": "Supports .xlsx and .xls",
    "submit": "Upload",
    "uploading": "Uploading..."
  },
  "sheetSelection": {
    "title": "Select sheets to import",
    "selectAll": "Select all",
    "deselectAll": "Deselect all",
    "continue": "Continue"
  },
  "columnMapping": {
    "title": "Map columns",
    "sourceColumn": "Source column",
    "targetField": "Target field",
    "skip": "Skip",
    "continue": "Continue"
  },
  "staging": {
    "title": "Staging preview",
    "rows": "Rows",
    "warnings": "Warnings",
    "errors": "Errors",
    "ready": "Ready",
    "confirm": "Confirm import",
    "back": "Back"
  },
  "result": {
    "success": "Import complete",
    "imported": "{{count}} rows imported",
    "errors": "{{count}} errors",
    "viewInventory": "View inventory",
    "importMore": "Import more"
  },
  "issues": {
    "title": "Issues",
    "warning": "Warning",
    "error": "Error"
  },
  "summary": {
    "total": "Total",
    "ready": "Ready",
    "warnings": "Warnings",
    "errors": "Errors"
  }
}
```

- [ ] **Step 4: Update ImportPage and all import components**

For each file: add `const { t } = useTranslation("import");` and replace every hardcoded string. Add missing keys to both JSON files as discovered.

- [ ] **Step 5: Commit**

```bash
git add client/src/i18n/locales/sv/import.json client/src/i18n/locales/en/import.json client/src/pages/ImportPage.tsx client/src/components/import/ client/src/components/structured-import/
git commit -m "feat: import namespace translations, update ImportPage and import components"
```

---

### Task 13: admin namespace + AdminSettingsPage and AdminUsersPage and admin components

**Files:**
- Create: `client/src/i18n/locales/sv/admin.json`
- Create: `client/src/i18n/locales/en/admin.json`
- Modify: `client/src/pages/AdminSettingsPage.tsx`
- Modify: `client/src/pages/AdminUsersPage.tsx`
- Modify: `client/src/components/admin/BackupFilesTable.tsx`
- Modify: `client/src/components/admin/BackupManagementPanel.tsx`
- Modify: `client/src/components/admin/BackupStatusCards.tsx`
- Modify: `client/src/components/admin/EmailSettingsPanel.tsx`
- Modify: `client/src/components/admin/InvitationsPanel.tsx`
- Modify: `client/src/components/admin/InviteUserForm.tsx`
- Modify: `client/src/components/admin/UsersTable.tsx`

- [ ] **Step 1: Read all admin files**

```bash
cat client/src/pages/AdminUsersPage.tsx
cat client/src/components/admin/BackupFilesTable.tsx
cat client/src/components/admin/BackupManagementPanel.tsx
cat client/src/components/admin/BackupStatusCards.tsx
cat client/src/components/admin/EmailSettingsPanel.tsx
cat client/src/components/admin/InvitationsPanel.tsx
cat client/src/components/admin/InviteUserForm.tsx
cat client/src/components/admin/UsersTable.tsx
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/admin.json`**

Start from this base and add every string found in Step 1:

```json
{
  "sectionLabel": "Administration",
  "settings": {
    "title": "Inställningar"
  },
  "users": {
    "sectionLabel": "Administration",
    "title": "Användare",
    "inviteUser": "Bjud in användare",
    "table": {
      "name": "Namn",
      "email": "E-post",
      "role": "Roll",
      "status": "Status",
      "actions": "Åtgärder",
      "noUsers": "Inga användare hittades."
    },
    "invitations": {
      "title": "Väntande inbjudningar",
      "empty": "Inga väntande inbjudningar.",
      "resend": "Skicka om",
      "revoke": "Återkalla"
    }
  },
  "invite": {
    "title": "Bjud in ny användare",
    "email": "E-post",
    "role": "Roll",
    "submit": "Skicka inbjudan",
    "submitting": "Skickar...",
    "success": "Inbjudan skickad.",
    "error": "Kunde inte skicka inbjudan."
  },
  "email": {
    "title": "E-postinställningar",
    "host": "SMTP-värd",
    "port": "Port",
    "user": "Användare",
    "password": "Lösenord",
    "from": "Från-adress",
    "secure": "Säker",
    "summaryRecipient": "Veckomottagare",
    "save": "Spara inställningar",
    "saving": "Sparar...",
    "sendTest": "Skicka testmail",
    "sending": "Skickar..."
  },
  "backup": {
    "title": "Säkerhetskopior",
    "runNow": "Kör nu",
    "running": "Kör...",
    "download": "Ladda ner",
    "noBackups": "Inga säkerhetskopior hittades.",
    "columns": {
      "file": "Fil",
      "size": "Storlek",
      "date": "Datum",
      "actions": "Åtgärder"
    }
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/admin.json`**

```json
{
  "sectionLabel": "Administration",
  "settings": {
    "title": "Settings"
  },
  "users": {
    "sectionLabel": "Administration",
    "title": "Users",
    "inviteUser": "Invite user",
    "table": {
      "name": "Name",
      "email": "Email",
      "role": "Role",
      "status": "Status",
      "actions": "Actions",
      "noUsers": "No users found."
    },
    "invitations": {
      "title": "Pending invitations",
      "empty": "No pending invitations.",
      "resend": "Resend",
      "revoke": "Revoke"
    }
  },
  "invite": {
    "title": "Invite new user",
    "email": "Email",
    "role": "Role",
    "submit": "Send invitation",
    "submitting": "Sending...",
    "success": "Invitation sent.",
    "error": "Could not send invitation."
  },
  "email": {
    "title": "Email settings",
    "host": "SMTP host",
    "port": "Port",
    "user": "User",
    "password": "Password",
    "from": "From address",
    "secure": "Secure",
    "summaryRecipient": "Weekly recipient",
    "save": "Save settings",
    "saving": "Saving...",
    "sendTest": "Send test email",
    "sending": "Sending..."
  },
  "backup": {
    "title": "Backups",
    "runNow": "Run now",
    "running": "Running...",
    "download": "Download",
    "noBackups": "No backups found.",
    "columns": {
      "file": "File",
      "size": "Size",
      "date": "Date",
      "actions": "Actions"
    }
  }
}
```

- [ ] **Step 4: Update admin pages and components**

In `AdminSettingsPage.tsx`:
- `"Administration"` → `{t("sectionLabel")}`
- `"Settings"` → `{t("settings.title")}`

In `AdminUsersPage.tsx`:
- `"Administration"` → `{t("users.sectionLabel")}`
- `"Users"` → `{t("users.title")}`

Update all `components/admin/` files similarly, using `useTranslation("admin")`.

- [ ] **Step 5: Commit**

```bash
git add client/src/i18n/locales/sv/admin.json client/src/i18n/locales/en/admin.json client/src/pages/AdminSettingsPage.tsx client/src/pages/AdminUsersPage.tsx client/src/components/admin/
git commit -m "feat: admin namespace translations, update admin pages and components"
```

---

### Task 14: usedIn + taken namespaces + UsedIn and TakenItems pages

**Files:**
- Create: `client/src/i18n/locales/sv/usedIn.json`
- Create: `client/src/i18n/locales/en/usedIn.json`
- Create: `client/src/i18n/locales/sv/taken.json`
- Create: `client/src/i18n/locales/en/taken.json`
- Modify: `client/src/pages/UsedInPage.tsx`
- Modify: `client/src/pages/UsedInDetailsPage.tsx`
- Modify: `client/src/pages/TakenItemsPage.tsx`

- [ ] **Step 1: Read UsedIn and TakenItems files**

```bash
cat client/src/pages/UsedInPage.tsx
cat client/src/pages/UsedInDetailsPage.tsx
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/usedIn.json`**

Start from this base and add every string found in Step 1:

```json
{
  "sectionLabel": "Används i",
  "title": "Används i",
  "create": {
    "label": "Nytt kort",
    "namePlaceholder": "Kortnamn",
    "submit": "Skapa"
  },
  "empty": {
    "title": "Inga \"Används i\"-kort",
    "description": "Skapa ett kort för att spåra var inventarier används."
  },
  "card": {
    "viewDetails": "Visa detaljer",
    "delete": "Ta bort"
  },
  "details": {
    "sectionLabel": "Används i",
    "assignStock": "Tilldela lager",
    "spots": "Platser",
    "addSpot": "Lägg till plats",
    "return": "Återlämna",
    "noAssignments": "Ingen tilldelning."
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/usedIn.json`**

```json
{
  "sectionLabel": "Used In",
  "title": "Used In",
  "create": {
    "label": "New card",
    "namePlaceholder": "Card name",
    "submit": "Create"
  },
  "empty": {
    "title": "No Used In cards",
    "description": "Create a card to track where inventory is being used."
  },
  "card": {
    "viewDetails": "View details",
    "delete": "Delete"
  },
  "details": {
    "sectionLabel": "Used In",
    "assignStock": "Assign stock",
    "spots": "Spots",
    "addSpot": "Add spot",
    "return": "Return",
    "noAssignments": "No assignments."
  }
}
```

- [ ] **Step 4: Create `client/src/i18n/locales/sv/taken.json`**

```json
{
  "sectionLabel": "Uttagna artiklar",
  "title": "Uttagna artiklar",
  "search": "Sök efter tabell, artikelnamn, plats...",
  "empty": {
    "noItems": "Inga artiklar är för tillfället uttagna.",
    "noMatch": "Inga artiklar matchar din sökning."
  },
  "table": {
    "taken": "Uttagna",
    "action": "Åtgärd",
    "return": "Återlämna"
  },
  "error": {
    "unavailable": "Uttagna artiklar är inte tillgängliga",
    "returnFailed": "Kunde inte återlämna artikel"
  }
}
```

- [ ] **Step 5: Create `client/src/i18n/locales/en/taken.json`**

```json
{
  "sectionLabel": "Taken items",
  "title": "Items taken out",
  "search": "Search by table, item name, location...",
  "empty": {
    "noItems": "No items are currently taken out.",
    "noMatch": "No items match your search."
  },
  "table": {
    "taken": "Taken",
    "action": "Action",
    "return": "Return"
  },
  "error": {
    "unavailable": "Taken items unavailable",
    "returnFailed": "Could not return item"
  }
}
```

- [ ] **Step 6: Update UsedIn pages**

Add `const { t } = useTranslation("usedIn");` to `UsedInPage.tsx` and `UsedInDetailsPage.tsx`. Replace all hardcoded strings.

- [ ] **Step 7: Update `TakenItemsPage.tsx`**

```tsx
const { t } = useTranslation("taken");
// Replace:
// "Taken items" sectionLabel → {t("sectionLabel")}
// "Items taken out" → {t("title")}
// "Search by table, item name, location..." → {t("search")}
// "No items are currently taken out." → {t("empty.noItems")}
// "No items match your search." → {t("empty.noMatch")}
// "Taken" column header → {t("table.taken")}
// "Action" column header → {t("table.action")}
// "Return" button → {t("table.return")}
// "Taken items unavailable" → t("error.unavailable")
// "Could not return item" → t("error.returnFailed")
```

- [ ] **Step 8: Commit**

```bash
git add client/src/i18n/locales/sv/usedIn.json client/src/i18n/locales/en/usedIn.json client/src/i18n/locales/sv/taken.json client/src/i18n/locales/en/taken.json client/src/pages/UsedInPage.tsx client/src/pages/UsedInDetailsPage.tsx client/src/pages/TakenItemsPage.tsx
git commit -m "feat: usedIn and taken namespace translations, update pages"
```

---

### Task 15: profile namespace + LanguagePicker component + ProfilePage

**Files:**
- Create: `client/src/i18n/locales/sv/profile.json`
- Create: `client/src/i18n/locales/en/profile.json`
- Create: `client/src/components/profile/LanguagePicker.tsx`
- Modify: `client/src/pages/ProfilePage.tsx`
- Modify: `client/src/components/profile/AvatarSection.tsx`
- Modify: `client/src/components/profile/ProfileForm.tsx`
- Modify: `client/src/components/profile/PasswordForm.tsx`
- Modify: `client/src/components/profile/LandingPagePicker.tsx`
- Modify: `client/src/components/profile/Field.tsx`
- Modify: `client/src/components/profile/AvatarCropModal.tsx`

- [ ] **Step 1: Read all profile component files**

```bash
cat client/src/components/profile/AvatarSection.tsx
cat client/src/components/profile/ProfileForm.tsx
cat client/src/components/profile/PasswordForm.tsx
cat client/src/components/profile/Field.tsx
cat client/src/components/profile/AvatarCropModal.tsx
```

- [ ] **Step 2: Create `client/src/i18n/locales/sv/profile.json`**

Start from this base and add every string found in Step 1:

```json
{
  "sectionLabel": "Konto",
  "title": "Profilinställningar",
  "subtitle": "Hantera din personliga information, säkerhet och startsida.",
  "form": {
    "title": "Personlig information",
    "firstName": "Förnamn",
    "lastName": "Efternamn",
    "displayName": "Visningsnamn",
    "email": "E-post",
    "phone": "Telefonnummer",
    "save": "Spara",
    "saving": "Sparar...",
    "saved": "Profil sparad."
  },
  "password": {
    "title": "Byt lösenord",
    "current": "Nuvarande lösenord",
    "new": "Nytt lösenord",
    "confirm": "Bekräfta nytt lösenord",
    "submit": "Byt lösenord",
    "submitting": "Sparar...",
    "saved": "Lösenord uppdaterat.",
    "error": {
      "mismatch": "Lösenorden matchar inte.",
      "incorrect": "Nuvarande lösenord är felaktigt."
    }
  },
  "avatar": {
    "change": "Byt profilbild",
    "remove": "Ta bort bild",
    "upload": "Ladda upp",
    "uploading": "Laddar upp...",
    "hint": "PNG, JPG, max 3 MB"
  },
  "landing": {
    "title": "Startsida",
    "description": "Välj var appen öppnas efter inloggning.",
    "defaultDescription": " Standardinställning är Instrumentpanel.",
    "appPages": "Appsidor",
    "groups": "Inventariegrupper",
    "tables": "Inventarietabeller",
    "reset": "Återställ till Instrumentpanel",
    "saved": "Startsida uppdaterad."
  },
  "language": {
    "title": "Språk",
    "description": "Välj ditt föredragna språk för gränssnittet.",
    "sv": "Svenska",
    "en": "Engelska",
    "savedSv": "Språket ändrades till svenska.",
    "savedEn": "Språket ändrades till engelska.",
    "error": "Kunde inte spara språkinställning."
  }
}
```

- [ ] **Step 3: Create `client/src/i18n/locales/en/profile.json`**

```json
{
  "sectionLabel": "Account",
  "title": "Profile settings",
  "subtitle": "Manage your personal information, security, and landing page.",
  "form": {
    "title": "Personal information",
    "firstName": "First name",
    "lastName": "Last name",
    "displayName": "Display name",
    "email": "Email",
    "phone": "Phone number",
    "save": "Save",
    "saving": "Saving...",
    "saved": "Profile saved."
  },
  "password": {
    "title": "Change password",
    "current": "Current password",
    "new": "New password",
    "confirm": "Confirm new password",
    "submit": "Change password",
    "submitting": "Saving...",
    "saved": "Password updated.",
    "error": {
      "mismatch": "Passwords do not match.",
      "incorrect": "Current password is incorrect."
    }
  },
  "avatar": {
    "change": "Change profile picture",
    "remove": "Remove picture",
    "upload": "Upload",
    "uploading": "Uploading...",
    "hint": "PNG, JPG, max 3 MB"
  },
  "landing": {
    "title": "Landing page",
    "description": "Choose where the app opens after you sign in.",
    "defaultDescription": " Currently defaulting to the Dashboard.",
    "appPages": "App pages",
    "groups": "Inventory groups",
    "tables": "Inventory tables",
    "reset": "Reset to Dashboard",
    "saved": "Landing page updated."
  },
  "language": {
    "title": "Language",
    "description": "Choose your preferred language for the interface.",
    "sv": "Svenska",
    "en": "English",
    "savedSv": "Language changed to Swedish.",
    "savedEn": "Language changed to English.",
    "error": "Could not save language preference."
  }
}
```

- [ ] **Step 4: Create `client/src/components/profile/LanguagePicker.tsx`**

```tsx
import { Check, Languages } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n/i18n";
import { updateProfileRequest, type ProfileData } from "../../services/profile.service";

type Language = "sv" | "en";

export function LanguagePicker({ profile, onSaved, onError }: {
  profile: ProfileData;
  onSaved: (message: string) => Promise<void> | void;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation("profile");
  const [saving, setSaving] = useState(false);
  const current = (profile.profile?.language ?? "sv") as Language;

  async function handleSelect(lang: Language) {
    if (lang === current || saving) return;
    setSaving(true);
    try {
      await updateProfileRequest({ language: lang });
      await i18n.changeLanguage(lang);
      const message = lang === "sv" ? t("language.savedSv") : t("language.savedEn");
      await onSaved(message);
    } catch (err) {
      onError(err instanceof Error ? err.message : t("language.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <div className="mb-1 flex items-center gap-2">
        <Languages className="text-accent" size={16} />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
          {t("language.title")}
        </h2>
      </div>
      <p className="mb-4 text-xs text-slate-500">{t("language.description")}</p>

      <div className="flex flex-wrap gap-2">
        {(["sv", "en"] as Language[]).map((lang) => (
          <button
            key={lang}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
              current === lang
                ? "border-accent bg-accent/15 text-accent"
                : "border-line bg-white/[0.03] text-slate-300 hover:border-accent/50"
            }`}
            disabled={saving}
            onClick={() => void handleSelect(lang)}
            type="button"
          >
            {current === lang ? <Check size={13} /> : null}
            {t(`language.${lang}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Update `client/src/pages/ProfilePage.tsx`**

```tsx
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/feedback/ToastProvider";
import { getProfileRequest, type ProfileData } from "../services/profile.service";
import { AvatarSection } from "../components/profile/AvatarSection";
import { ProfileForm } from "../components/profile/ProfileForm";
import { PasswordForm } from "../components/profile/PasswordForm";
import { LandingPagePicker } from "../components/profile/LandingPagePicker";
import { LanguagePicker } from "../components/profile/LanguagePicker";

export function ProfilePage() {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const { t } = useTranslation("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const loadProfile = useCallback(() => {
    getProfileRequest()
      .then((result) => setProfile(result.profile))
      .catch((err) => toast.error(err instanceof Error ? err.message : t("form.saved")));
  }, [toast, t]);

  useEffect(loadProfile, [loadProfile]);

  const handleSaved = useCallback(async (message: string) => {
    loadProfile();
    await refreshUser();
    toast.success(message);
  }, [loadProfile, refreshUser, toast]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("sectionLabel")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("title")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("subtitle")}</p>
      </header>

      {profile ? (
        <>
          <AvatarSection profile={profile} onUpdated={handleSaved} onError={toast.error} />
          <ProfileForm profile={profile} onSaved={handleSaved} />
          <PasswordForm onSaved={toast.success} onError={toast.error} />
          <LandingPagePicker profile={profile} onSaved={handleSaved} onError={toast.error} />
          <LanguagePicker profile={profile} onSaved={handleSaved} onError={toast.error} />
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Update remaining profile components**

For `AvatarSection.tsx`, `ProfileForm.tsx`, `PasswordForm.tsx`, `LandingPagePicker.tsx`, `Field.tsx`, `AvatarCropModal.tsx`: add `const { t } = useTranslation("profile");` and replace all hardcoded strings with keys from `profile.json`.

In `LandingPagePicker.tsx` replace:
- `"Landing page"` → `{t("landing.title")}`
- `"Choose where the app opens after you sign in."` → `{t("landing.description")}`
- `" Currently defaulting to the Dashboard."` → `{t("landing.defaultDescription")}`
- `"App pages"` → `{t("landing.appPages")}`
- `"Inventory groups"` → `{t("landing.groups")}`
- `"Inventory tables"` → `{t("landing.tables")}`
- `"Reset to Dashboard"` → `{t("landing.reset")}`
- `` `Landing page set to ${option.label}.` `` → `t("landing.saved")`

- [ ] **Step 7: Commit**

```bash
git add client/src/i18n/locales/sv/profile.json client/src/i18n/locales/en/profile.json client/src/components/profile/LanguagePicker.tsx client/src/pages/ProfilePage.tsx client/src/components/profile/
git commit -m "feat: profile namespace, LanguagePicker component, update ProfilePage and profile components"
```

---

### Task 16: Translate remaining shared components

**Files:**
- Modify: `client/src/components/InlineManagerStrip.tsx`
- Modify: `client/src/components/Modal.tsx`
- Modify: `client/src/components/ResourceManagerPicker.tsx`
- Modify: `client/src/components/UserAvatar.tsx`
- Modify: `client/src/components/feedback/ToastProvider.tsx`
- Modify: `client/src/components/qr/QrScannerModal.tsx`
- Modify: `client/src/components/qr/QrScanResultCard.tsx`

- [ ] **Step 1: Read each shared component**

```bash
cat client/src/components/InlineManagerStrip.tsx
cat client/src/components/Modal.tsx
cat client/src/components/ResourceManagerPicker.tsx
cat client/src/components/UserAvatar.tsx
cat client/src/components/feedback/ToastProvider.tsx
cat client/src/components/qr/QrScannerModal.tsx
cat client/src/components/qr/QrScanResultCard.tsx
```

- [ ] **Step 2: Add any new strings found to `common.json`**

For strings that belong to no specific namespace (generic actions, modal buttons, QR scanner), add them to both `common.json` files.

Example additions to `sv/common.json` / `en/common.json` if found:
```json
// sv additions
"scan": "Skanna",
"scanning": "Skannar...",
"scanQr": "Skanna QR-kod",
"stopScanning": "Sluta skanna",
"manager": "Ansvarig",
"noManager": "Ingen ansvarig"
```

- [ ] **Step 3: Update each file**

Use `useTranslation("common")` for generic strings that don't belong to a specific namespace.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/InlineManagerStrip.tsx client/src/components/Modal.tsx client/src/components/ResourceManagerPicker.tsx client/src/components/UserAvatar.tsx client/src/components/feedback/ToastProvider.tsx client/src/components/qr/ client/src/i18n/locales/sv/common.json client/src/i18n/locales/en/common.json
git commit -m "feat: translate remaining shared components using common namespace"
```

---

### Task 17: Final verification

- [ ] **Step 1: TypeScript check**

```bash
cd tool-inventory-system/client
npm run lint
```

Expected: no errors.

- [ ] **Step 2: Start the app and verify Swedish default**

```bash
cd tool-inventory-system
docker compose up
```

Open the app in a browser. Verify:
- Login page shows Swedish text ("Logga in", "E-post", "Lösenord")
- Sidebar shows Swedish nav labels ("Instrumentpanel", "Inventarier", etc.)
- Dashboard shows "Instrumentpanel" heading

- [ ] **Step 3: Switch to English in Profile**

1. Log in.
2. Navigate to `/profile`.
3. Scroll to the Language section.
4. Click "English".
5. Verify the entire UI switches to English immediately without page reload.
6. Reload the page. Verify it stays in English (fetched from profile).

- [ ] **Step 4: Switch back to Swedish**

1. In Profile, click "Svenska".
2. Verify UI switches back to Swedish immediately.

- [ ] **Step 5: Log out and verify reset**

1. Log out.
2. Verify the login page shows Swedish ("Logga in").

- [ ] **Step 6: Line-count check**

```bash
cd tool-inventory-system
npm run check:lines
```

Expected: no files exceed 350 lines.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "feat: complete Swedish-default i18n — all 172 components translated"
```
