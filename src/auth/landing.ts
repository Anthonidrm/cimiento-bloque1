import type { Role } from "./types";

/** Área a la que entra cada rol después de autenticarse. */
export function landingFor(role: Role): string {
  switch (role) {
    case "ADMINISTRADOR":
      return "/administracion";
    case "PASTOR":
      return "/pastor";
    case "MAESTRO":
      return "/maestros";
    case "ESTUDIANTE":
      return "/estudiante";
  }
}

/** Páginas que se pueden ver sin iniciar sesión. Todo lo demás exige autenticación. */
export const PUBLIC_PATHS = ["/login", "/sobre-cimiento"];

/** Rutas a las que puede entrar un estudiante: solo su área, su cuenta y el login. */
export const STUDENT_ALLOWED = ["/estudiante", "/cuenta", "/login"];

export function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

/**
 * Decisión de acceso a nivel de aplicación (la usa Layout):
 *  - sin sesión: solo rutas públicas; el resto lleva primero al login (recordando a dónde iba);
 *  - estudiante: solo su área, su cuenta y el login.
 * Devuelve la ruta a la que redirigir, o null si puede continuar.
 */
export function layoutRedirect(role: Role | undefined, pathname: string, mustChangePassword = false): string | null {
  const p = normalizePath(pathname);
  if (!role) {
    if (PUBLIC_PATHS.includes(p)) return null;
    return p === "/" ? "/login" : `/login?next=${encodeURIComponent(p)}`;
  }
  // Primer acceso (solo con backend): hasta definir su contraseña, el usuario solo puede estar en /cuenta.
  if (mustChangePassword && p !== "/cuenta" && p !== "/login") return "/cuenta";
  if (role === "ESTUDIANTE" && !STUDENT_ALLOWED.includes(p)) return "/estudiante";
  return null;
}
