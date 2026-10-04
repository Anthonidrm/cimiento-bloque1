import { readJSON, writeJSON, removeKey } from "../utils/storage";
import type { Session } from "./types";

const SESSION_KEY = "cimiento:auth:session";

export function getSession(): Session | null {
  return readJSON<Session | null>(SESSION_KEY, null);
}

export function setSession(s: Session): void {
  writeJSON(SESSION_KEY, s);
}

export function clearSession(): void {
  removeKey(SESSION_KEY);
}

/** Identificador del usuario activo, usado para separar el progreso de cada usuario. */
export function getCurrentUserId(): string {
  return getSession()?.userId ?? "anon";
}
