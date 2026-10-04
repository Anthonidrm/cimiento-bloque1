import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "./types";

/** Protege una ruta: exige sesión y, opcionalmente, uno de los roles indicados. */
export default function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();

  if (!session) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (roles && !roles.includes(session.role)) {
    return <Navigate to={session.role === "ESTUDIANTE" ? "/estudiante" : "/"} replace />;
  }
  return <>{children}</>;
}
