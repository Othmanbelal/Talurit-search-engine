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
