import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getSession } from "./session";
import * as svc from "./authService";
import type { Session } from "./types";

interface AuthValue {
  session: Session | null;
  login: (id: string, pw: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => getSession());

  const login = useCallback(async (id: string, pw: string) => {
    const r = await svc.login(id, pw);
    if (r.ok) {
      setSessionState(r.session);
      return { ok: true };
    }
    return { ok: false, error: r.error };
  }, []);

  const logout = useCallback(() => {
    svc.logout();
    setSessionState(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
