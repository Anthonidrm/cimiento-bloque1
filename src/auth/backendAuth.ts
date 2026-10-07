// Autenticación REAL con Supabase Auth. Las contraseñas las guarda y verifica Supabase (nunca esta app).
// El rol sale de la tabla `profiles` en el servidor; la interfaz solo lo refleja (los permisos reales los aplica la base de datos).
import { getClient } from "../backend/client";
import { getMyProfile } from "../backend/people";
import { usernameToEmail } from "../backend/config";
import type { Profile } from "../backend/types";
import type { Session } from "./types";

export const BACKEND_MIN_PASSWORD = 8;

function toSession(p: Profile): Session {
  return { userId: p.id, role: p.role, displayName: p.display_name, startedAt: new Date().toISOString(), username: p.username, mustChangePassword: p.must_change_password, source: "supabase" };
}

export async function backendLogin(username: string, password: string): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const generic = { ok: false as const, error: "Usuario o contraseña incorrectos." };
  const { error } = await getClient().auth.signInWithPassword({ email: usernameToEmail(username), password });
  if (error) {
    const e = error as { status?: number; code?: string };
    if (e.code === "user_banned") return { ok: false, error: "Tu acceso está desactivado. Habla con el Administrador." };
    if (e.status === 400) return generic; // credenciales incorrectas (mensaje genérico: no revela qué usuarios existen)
    return { ok: false, error: "No se pudo conectar con el servidor. Revisa que la URL y la clave de Supabase de la aplicación sean correctas, o inténtalo de nuevo." };
  }
  const profile = await getMyProfile();
  if (!profile || !profile.active) {
    await getClient().auth.signOut();
    return { ok: false, error: "Tu acceso está desactivado. Habla con el Administrador." };
  }
  return { ok: true, session: toSession(profile) };
}

/** Recupera la sesión guardada por Supabase al recargar la página. */
export async function backendRestore(): Promise<Session | null> {
  const { data } = await getClient().auth.getSession();
  if (!data.session) return null;
  const profile = await getMyProfile();
  return profile && profile.active ? toSession(profile) : null;
}

export async function backendLogout(): Promise<void> {
  await getClient().auth.signOut();
}

/** Cambia la contraseña propia: verifica la actual, la cambia en Supabase Auth y limpia la marca de primer acceso. */
export async function backendChangePassword(username: string, current: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (next.length < BACKEND_MIN_PASSWORD) return { ok: false, error: `La nueva contraseña debe tener al menos ${BACKEND_MIN_PASSWORD} caracteres.` };
  if (next === current) return { ok: false, error: "La nueva contraseña debe ser distinta de la actual." };
  const c = getClient();
  const check = await c.auth.signInWithPassword({ email: usernameToEmail(username), password: current });
  if (check.error) return { ok: false, error: "La contraseña actual no es correcta." };
  const up = await c.auth.updateUser({ password: next });
  if (up.error) return { ok: false, error: up.error.message };
  const done = await c.rpc("complete_first_access");
  if (done.error) return { ok: false, error: done.error.message };
  return { ok: true };
}
