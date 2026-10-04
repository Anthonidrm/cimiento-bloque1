// Lógica de autenticación del lado del cliente (sin backend todavía).
// - Las cuentas iniciales viven en users.ts (solo salt + hash).
// - Los cambios de contraseña se guardan como "overrides" en localStorage
//   DEL NAVEGADOR donde se hacen. Sin backend no se propagan a otros
//   dispositivos: eso se resuelve al conectar Supabase.
import { SEED_USERS } from "./users";
import { hashPassword, randomSalt } from "./crypto";
import { clearSession, getSession, setSession } from "./session";
import { readJSON, writeJSON } from "../utils/storage";
import type { Role, Session, UserRecord } from "./types";

const OVERRIDES_KEY = "cimiento:auth:overrides";

interface Override {
  salt: string;
  hash: string;
  changedAt: string;
}

function overrides(): Record<string, Override> {
  return readJSON<Record<string, Override>>(OVERRIDES_KEY, {});
}

export function listUsers(): UserRecord[] {
  return SEED_USERS;
}

export function findUser(loginId: string): UserRecord | undefined {
  const id = loginId.trim().toLowerCase();
  if (!id) return undefined;
  return SEED_USERS.find((u) => u.id === id || u.aliases.includes(id));
}

function credentialsFor(user: UserRecord): { salt: string; hash: string } {
  const o = overrides()[user.id];
  return o ? { salt: o.salt, hash: o.hash } : { salt: user.salt, hash: user.hash };
}

export async function verifyPassword(user: UserRecord, password: string): Promise<boolean> {
  const { salt, hash } = credentialsFor(user);
  const candidate = await hashPassword(password, salt);
  return candidate === hash;
}

export async function login(
  loginId: string,
  password: string
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const user = findUser(loginId);
  // Mensaje genérico: no revela si el usuario existe.
  const generic = "Usuario o contraseña incorrectos.";
  if (!user || !password) return { ok: false, error: generic };
  const valid = await verifyPassword(user, password);
  if (!valid) return { ok: false, error: generic };
  const session: Session = {
    userId: user.id,
    role: user.role,
    displayName: user.displayName,
    startedAt: new Date().toISOString(),
  };
  setSession(session);
  return { ok: true, session };
}

export function logout(): void {
  clearSession();
}

export async function setNewPassword(userId: string, newPassword: string): Promise<void> {
  const salt = randomSalt();
  const hash = await hashPassword(newPassword, salt);
  const all = overrides();
  all[userId] = { salt, hash, changedAt: new Date().toISOString() };
  writeJSON(OVERRIDES_KEY, all);
}

export const MIN_PASSWORD_LENGTH = 6;

/** El usuario cambia su propia contraseña (debe conocer la actual). */
export async function changeOwnPassword(
  current: string,
  next: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = getSession();
  if (!session) return { ok: false, error: "No hay una sesión activa." };
  const user = SEED_USERS.find((u) => u.id === session.userId);
  if (!user) return { ok: false, error: "Usuario no encontrado." };
  if (!(await verifyPassword(user, current))) {
    return { ok: false, error: "La contraseña actual no es correcta." };
  }
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  await setNewPassword(user.id, next);
  return { ok: true };
}

/** Solo el administrador puede restablecer la contraseña de otro usuario. */
export async function adminResetPassword(
  targetUserId: string,
  next: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = getSession();
  const role: Role | undefined = session?.role;
  if (role !== "ADMINISTRADOR") return { ok: false, error: "Solo el administrador puede restablecer contraseñas." };
  if (!SEED_USERS.some((u) => u.id === targetUserId)) return { ok: false, error: "Usuario no encontrado." };
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  await setNewPassword(targetUserId, next);
  return { ok: true };
}

export function passwordChangedAt(userId: string): string | null {
  return overrides()[userId]?.changedAt ?? null;
}
