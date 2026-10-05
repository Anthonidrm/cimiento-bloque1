import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, setMemorySession } from "./session";
import * as svc from "./authService";
import * as be from "./backendAuth";
import { isBackendConfigured } from "../backend/config";
import { hydrateAll } from "../backend/sync";
import type { Session } from "./types";

interface AuthValue {
  session: Session | null;
  /** true mientras se recupera la sesión del backend al cargar la página. */
  loading: boolean;
  /** true si la app está conectada a Supabase (autenticación real). */
  backend: boolean;
  login: (id: string, pw: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  /** Vuelve a leer el perfil (p. ej. tras completar el primer acceso). */
  refresh: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const backend = isBackendConfigured();
  const [session, setSessionState] = useState<Session | null>(() => (backend ? null : getSession()));
  const [loading, setLoading] = useState(backend);

  useEffect(() => {
    if (!backend) return;
    let live = true;
    be.backendRestore()
      .catch(() => null)
      .then(async (s) => {
        if (!live) return;
        setMemorySession(s);
        if (s) await hydrateAll();
        if (!live) return;
        setSessionState(s);
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [backend]);

  const login = useCallback(
    async (id: string, pw: string) => {
      const r = backend ? await be.backendLogin(id, pw) : await svc.login(id, pw);
      if (r.ok) {
        if (backend) {
          setMemorySession(r.session);
          await hydrateAll();
        }
        setSessionState(r.session);
        return { ok: true };
      }
      return { ok: false, error: r.error };
    },
    [backend]
  );

  const logout = useCallback(() => {
    if (backend) {
      void be.backendLogout();
      setMemorySession(null);
    } else svc.logout();
    setSessionState(null);
  }, [backend]);

  const refresh = useCallback(async () => {
    if (!backend) return;
    const s = await be.backendRestore();
    setMemorySession(s);
    setSessionState(s);
  }, [backend]);

  const value = useMemo(() => ({ session, loading, backend, login, logout, refresh }), [session, loading, backend, login, logout, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
