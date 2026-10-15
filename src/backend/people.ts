import { getClient, unwrap } from "./client";
import type { Group, Profile, Role } from "./types";

export async function getMyProfile(): Promise<Profile | null> {
  const rows = unwrap(await getClient().rpc("my_profile")) as Profile[] | null;
  return rows && rows.length ? rows[0] : null;
}

export async function listProfiles(role?: Role): Promise<Profile[]> {
  let q = getClient().from("profiles").select("id, username, display_name, role, active, must_change_password").order("display_name");
  if (role) q = q.eq("role", role);
  return unwrap(await q) as Profile[];
}

// --- Administración de usuarios: requiere la Edge Function `admin-users` (usa service_role en el servidor) ---
type AdminAction =
  | { action: "ping" }
  | { action: "create"; username: string; displayName: string; role: Role; password: string }
  | { action: "update"; id: string; role?: Role; displayName?: string; active?: boolean }
  | { action: "reset_password"; id: string; password: string }
  | { action: "remove_access"; id: string };

async function admin(body: AdminAction) {
  const client = getClient();

  // Enviar explícitamente el token de Supabase Auth evita llamar a la función sin sesión.
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) {
    throw new Error("No hay una sesión activa de Supabase. Cierra sesión y vuelve a entrar para renovar el acceso.");
  }

  const { data, error } = await client.functions.invoke("admin-users", {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) {
    // supabase-js oculta el motivo real tras "non-2xx"; la función lo devuelve en el cuerpo ({ error: "..."}).
    let msg = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try { const b = await ctx.json(); if (b?.error) msg = String(b.error); } catch { /* sin cuerpo legible */ }
    }
    throw new Error(msg);
  }
  if (data && (data as { error?: string }).error) throw new Error((data as { error: string }).error);
  return data as { ok: true; id?: string; emailDomain?: string };
}
export const adminCreateUser = (u: { username: string; displayName: string; role: Role; password: string }) => admin({ action: "create", ...u });
export const adminUpdateUser = (id: string, patch: { role?: Role; displayName?: string; active?: boolean }) => admin({ action: "update", id, ...patch });
export const adminResetPassword = (id: string, password: string) => admin({ action: "reset_password", id, password });
/** Comprueba que la función `admin-users` está desplegada y devuelve el dominio interno de correo que usa. */
export const adminPing = () => admin({ action: "ping" });
export const adminRemoveAccess = (id: string) => admin({ action: "remove_access", id });

// --- Grupos, matrículas y maestros de grupo ---
export async function listGroups(): Promise<Group[]> { return unwrap(await getClient().from("student_groups").select("*").order("name")) as Group[]; }
export async function createGroup(name: string, ageRange?: string) { unwrap(await getClient().from("student_groups").insert({ name, age_range: ageRange ?? null })); }
export async function enrollStudent(studentId: string, groupId: string) { unwrap(await getClient().from("enrollments").upsert({ student_id: studentId, group_id: groupId })); }
export async function unenrollStudent(studentId: string, groupId: string) { unwrap(await getClient().from("enrollments").delete().eq("student_id", studentId).eq("group_id", groupId)); }
export async function listEnrollments(): Promise<{ student_id: string; group_id: string }[]> { return unwrap(await getClient().from("enrollments").select("student_id, group_id")) as never; }
export async function addGroupTeacher(groupId: string, teacherId: string) { unwrap(await getClient().from("group_teachers").upsert({ group_id: groupId, teacher_id: teacherId })); }
export async function removeGroupTeacher(groupId: string, teacherId: string) { unwrap(await getClient().from("group_teachers").delete().eq("group_id", groupId).eq("teacher_id", teacherId)); }
export async function listGroupTeachers(): Promise<{ group_id: string; teacher_id: string }[]> { return unwrap(await getClient().from("group_teachers").select("group_id, teacher_id")) as never; }
