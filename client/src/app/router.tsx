import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { AdminRoute } from "./admin-route";
import { LandingRedirect } from "./landing-redirect";
import { ProtectedRoute } from "./protected-route";
import { AcceptInvitePage } from "../pages/AcceptInvitePage";
import { AdminSettingsPage } from "../pages/AdminSettingsPage";
import { AdminUsersPage } from "../pages/AdminUsersPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ImportPage } from "../pages/ImportPage";
import { InventoryPage } from "../pages/InventoryPage";
import { LocationMapPage } from "../pages/LocationMapPage";
import { LocationsPage } from "../pages/LocationsPage";
import { LoginPage } from "../pages/LoginPage";
import { MachineDetailsPage } from "../pages/MachineDetailsPage";
import { MachinesPage } from "../pages/MachinesPage";
import { StructuredInventoryGroupPage } from "../pages/StructuredInventoryGroupPage";
import { StructuredInventoryTablePage } from "../pages/StructuredInventoryTablePage";
import { ProfilePage } from "../pages/ProfilePage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { TakenItemsPage } from "../pages/TakenItemsPage";
import { ToolsPage } from "../pages/ToolsPage";
import { UsedInDetailsPage } from "../pages/UsedInDetailsPage";
import { UsedInPage } from "../pages/UsedInPage";
import { WarehouseDesignPage } from "../pages/WarehouseDesignPage";
import { WarehouseDetailsPage } from "../pages/WarehouseDetailsPage";
import { WarehousesPage } from "../pages/WarehousesPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<ForgotPasswordPage />} path="/forgot-password" />
      <Route element={<ResetPasswordPage />} path="/reset-password" />
      <Route element={<AcceptInvitePage />} path="/accept-invite" />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route element={<LandingRedirect />} index />
          <Route element={<DashboardPage />} path="/dashboard" />
          <Route element={<ImportPage />} path="/import" />
          <Route element={<InventoryPage />} path="/inventory" />
          <Route element={<StructuredInventoryGroupPage />} path="/inventory/groups/:id" />
          <Route element={<StructuredInventoryTablePage />} path="/inventory/tables/:id" />
          <Route element={<UsedInPage />} path="/used-in" />
          <Route element={<UsedInDetailsPage />} path="/used-in/:id" />
          <Route element={<TakenItemsPage />} path="/taken-items" />
          <Route element={<WarehousesPage />} path="/warehouses" />
          <Route element={<WarehouseDesignPage />} path="/warehouses/new" />
          <Route element={<WarehouseDetailsPage />} path="/warehouses/:id" />
          <Route element={<WarehouseDesignPage />} path="/warehouses/:id/design" />
          <Route element={<LocationsPage />} path="/locations" />
          <Route element={<LocationMapPage />} path="/locations/map" />
          <Route element={<MachinesPage />} path="/machines" />
          <Route element={<MachineDetailsPage />} path="/machines/:id" />
          <Route element={<ProfilePage />} path="/profile" />
          <Route element={<ToolsPage />} path="/tools" />
          <Route element={<AdminRoute />}>
            <Route element={<AdminUsersPage />} path="/admin/users" />
            <Route element={<AdminSettingsPage />} path="/admin/settings" />
          </Route>
        </Route>
      </Route>
      <Route element={<Navigate replace to="/dashboard" />} path="*" />
    </Routes>
  );
}
