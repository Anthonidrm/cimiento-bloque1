export type Role = "ADMINISTRADOR" | "PASTOR" | "MAESTRO" | "ESTUDIANTE";

export const ROLE_LABELS: Record<Role, string> = {
  ADMINISTRADOR: "Administrador",
  PASTOR: "Pastor",
  MAESTRO: "Maestro",
  ESTUDIANTE: "Estudiante",
};

/** Roles con acceso al área de maestros (guía, preparación, examen). */
export const STAFF_ROLES: Role[] = ["ADMINISTRADOR", "PASTOR", "MAESTRO"];

export interface UserRecord {
  id: string; // identificador de acceso, en minúsculas
  aliases: string[]; // otros nombres de acceso aceptados (minúsculas)
  displayName: string;
  role: Role;
  salt: string; // base64
  hash: string; // PBKDF2-SHA256, base64
}

export interface Session {
  userId: string;
  role: Role;
  displayName: string;
  startedAt: string;
}
