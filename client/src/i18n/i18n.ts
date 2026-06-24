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
