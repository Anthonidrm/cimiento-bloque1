// Configuración del backend (Supabase). Si faltan las variables de entorno, la aplicación funciona en MODO LOCAL:
// las funciones multiusuario muestran "backend no configurado" (NO se simulan con localStorage).
//
//   VITE_SUPABASE_URL        URL del proyecto, p. ej. https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY   clave pública (anon). La service_role NUNCA va en el navegador.
//   VITE_AUTH_EMAIL_DOMAIN   dominio interno para convertir "usuario" en correo (por defecto cimiento.app)
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const BACKEND_URL = env?.VITE_SUPABASE_URL;
export const BACKEND_KEY = env?.VITE_SUPABASE_ANON_KEY;
export const AUTH_EMAIL_DOMAIN = env?.VITE_AUTH_EMAIL_DOMAIN ?? "cimiento.app";

/** El nombre de acceso se convierte en el correo interno con el que existe en Supabase Auth. */
export const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

/** Variables que faltan para conectar con el servidor (para mostrarlas en la pantalla de configuración; nunca sus valores). */
export function missingBackendVars(): string[] {
  return [BACKEND_URL ? "" : "VITE_SUPABASE_URL", BACKEND_KEY ? "" : "VITE_SUPABASE_ANON_KEY"].filter(Boolean);
}

// El MODO LOCAL (sin servidor, con usuarios de ejemplo y datos del navegador) es solo una ayuda de DESARROLLO.
// En una publicación (Vercel) sin Supabase configurado NO se ofrece: se muestra la pantalla "falta configurar el servidor".
// Se puede permitir explícitamente con VITE_ALLOW_LOCAL_MODE=true (no recomendado fuera de pruebas).
const meta = (import.meta as unknown as { env?: { DEV?: boolean } & Record<string, string | undefined> }).env;
let localForTests = false;
export function allowLocalForTests(v: boolean) { localForTests = v; }
export function localModeAllowed(): boolean { return localForTests || meta?.DEV === true || meta?.VITE_ALLOW_LOCAL_MODE === "true"; }

let forced = false;
/** Solo pruebas: da el backend por configurado (se inyecta un cliente). */
export function forceBackendConfigured(v: boolean) { forced = v; }
/** ¿La aplicación está conectada a un backend? Ligero: no carga supabase-js. */
export function isBackendConfigured(): boolean { return forced || Boolean(BACKEND_URL && BACKEND_KEY); }
