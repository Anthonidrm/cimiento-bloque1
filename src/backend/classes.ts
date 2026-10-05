import { getClient, unwrap } from "./client";
import type { AttendanceStatus, ClassReport, Profile, SessionRow } from "./types";

/** Inicia la clase. El servidor verifica quién puede y qué preparación se exige. */
export async function startClass(week: number, groupId?: string): Promise<string> {
  return unwrap(await getClient().rpc("start_class", { p_week: week, p_group: groupId ?? null })) as string;
}
export async function endClass(sessionId: string) { unwrap(await getClient().rpc("end_class", { p_session: sessionId })); }
export async function listSessions(): Promise<SessionRow[]> { return unwrap(await getClient().from("v_sessions").select("*").order("started_at", { ascending: false })) as SessionRow[]; }
export async function openSession(week: number): Promise<SessionRow | null> {
  const rows = unwrap(await getClient().from("v_sessions").select("*").eq("week", week).eq("status", "EN_CURSO").limit(1)) as SessionRow[];
  return rows[0] ?? null;
}

export async function listAttendance(sessionId: string): Promise<{ student_id: string; status: AttendanceStatus }[]> {
  return unwrap(await getClient().from("attendance").select("student_id, status").eq("session_id", sessionId)) as never;
}
/** Pase de lista: PRESENTE / AUSENTE / EXCUSA. Alimenta la puntuación automáticamente. */
export async function markAttendance(sessionId: string, studentId: string, status: AttendanceStatus) {
  unwrap(await getClient().from("attendance").upsert({ session_id: sessionId, student_id: studentId, status }, { onConflict: "session_id,student_id" }));
}
/** Estudiantes que el usuario puede ver (los de sus grupos si es maestro). */
export async function listMyStudents(): Promise<Profile[]> {
  return unwrap(await getClient().from("profiles").select("id, username, display_name, role, active, must_change_password").eq("role", "ESTUDIANTE").order("display_name")) as Profile[];
}

export async function logEvent(sessionId: string, kind: "PRESENTACION" | "ACTIVIDAD" | "INTERACCION" | "NOTA", payload: Record<string, unknown> = {}) {
  unwrap(await getClient().rpc("session_event", { p_session: sessionId, p_kind: kind, p_payload: payload }));
}
export async function addNote(sessionId: string, text: string) { unwrap(await getClient().rpc("session_note", { p_session: sessionId, p_text: text })); }
export async function listReports(): Promise<ClassReport[]> { return unwrap(await getClient().from("class_reports").select("*").order("created_at", { ascending: false })) as ClassReport[]; }
export async function reportDeliveries() {
  return unwrap(await getClient().from("notification_deliveries").select("*").order("created_at", { ascending: false })) as { id: string; to_address: string; subject: string; status: string; sent_at: string | null }[];
}
