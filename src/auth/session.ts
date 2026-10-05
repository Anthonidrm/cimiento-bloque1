import { readJSON, writeJSON, removeKey } from "../utils/storage";
import type { Session } from "./types";

const SESSION_KEY = "cimiento:auth:session";

// Con backend, la sesión viene de Supabase Auth y vive en memoria: NO se lee ni se escribe en localStorage
// (así no puede suplantarse editando el navegador). Sin backend (modo local) se conserva el comportamiento anterior.
let memoryMode = false;
let memorySession: Session | null = null;

export function setMemorySession(s: Session | null): void {
  memoryMode = true;
  memorySession = s;
}

export function getSession(): Session | null {
  return memoryMode ? memorySession : readJSON<Session | null>(SESSION_KEY, null);
}

export function setSession(s: Session): void {
  if (memoryMode) memorySession = s;
  else writeJSON(SESSION_KEY, s);
}

export function clearSession(): void {
  if (memoryMode) memorySession = null;
  else removeKey(SESSION_KEY);
}

/** Identificador del usuario activo, usado para separar el progreso de cada usuario. */
export function getCurrentUserId(): string {
  return getSession()?.userId ?? "anon";
}
