import { getClient, unwrap } from "./client";
import type { Crown, Game, IntegrationActivity, MandatoryActivity, StudentProgress, Submission, Task } from "./types";

// --- Estudiante ---
export async function myScores(): Promise<StudentProgress[]> { return unwrap(await getClient().from("v_student_progress").select("*").order("week")) as StudentProgress[]; }
export async function myCrowns(): Promise<Crown[]> { return unwrap(await getClient().from("crowns").select("*").order("awarded_at", { ascending: false })) as Crown[]; }
export async function listTasks(): Promise<Task[]> { return unwrap(await getClient().from("assignments").select("id, week, title, description, opens_at, closes_at").order("closes_at", { ascending: false })) as Task[]; }
export async function listSubmissions(assignmentId?: string): Promise<Submission[]> {
  let q = getClient().from("submissions").select("*").order("submitted_at", { ascending: false });
  if (assignmentId) q = q.eq("assignment_id", assignmentId);
  return unwrap(await q) as Submission[];
}
export async function submitLink(assignmentId: string, url: string) { unwrap(await getClient().from("submissions").insert({ assignment_id: assignmentId, kind: "ENLACE", url })); }
/** Sube el archivo al bucket PRIVADO `entregas` ({tarea}/{estudiante}/{fecha}-{nombre}) y registra la entrega. */
export async function submitFile(assignmentId: string, studentId: string, file: File, kind: "DOCUMENTO" | "IMAGEN") {
  const path = `${assignmentId}/${studentId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const up = await getClient().storage.from("entregas").upload(path, file);
  if (up.error) throw new Error(up.error.message);
  unwrap(await getClient().from("submissions").insert({ assignment_id: assignmentId, kind, storage_path: path }));
}
export async function signedUrl(bucket: "recursos" | "entregas" | "fotos", path: string, seconds = 600): Promise<string> {
  const r = await getClient().storage.from(bucket).createSignedUrl(path, seconds);
  if (r.error) throw new Error(r.error.message);
  return r.data.signedUrl;
}
export async function listActivities(): Promise<MandatoryActivity[]> { return unwrap(await getClient().from("mandatory_activities").select("*").order("due_at")) as MandatoryActivity[]; }
export async function completeActivity(activityId: string, evidence?: string) { unwrap(await getClient().from("activity_submissions").insert({ activity_id: activityId, evidence: evidence ?? null })); }
export async function mySubmittedActivities(): Promise<string[]> { return (unwrap(await getClient().from("activity_submissions").select("activity_id")) as { activity_id: string }[]).map((r) => r.activity_id); }
export async function listGames(): Promise<Game[]> { return unwrap(await getClient().from("games").select("*").order("week")) as Game[]; }
export async function saveGameResult(gameId: string, score: number, maxScore: number, details: Record<string, unknown> = {}) {
  unwrap(await getClient().from("game_results").insert({ game_id: gameId, score, max_score: maxScore, details }));
}
export async function myIntegration(): Promise<{ week: number }[]> { return unwrap(await getClient().from("integration_assignments").select("week")) as never; }
export async function listIntegrationActivities(): Promise<IntegrationActivity[]> { return unwrap(await getClient().from("integration_activities").select("*").order("week")) as IntegrationActivity[]; }

// --- Maestro / Pastor / Administrador ---
export async function createTask(t: { week: number; title: string; description?: string; opens_at: string; closes_at: string }) { unwrap(await getClient().from("assignments").insert(t)); }
export async function gradeSubmission(id: string, grade: number, comment?: string) { unwrap(await getClient().rpc("grade_submission", { p_submission: id, p_grade: grade, p_comment: comment ?? null })); }
export async function setParticipation(studentId: string, week: number, pts: number) { unwrap(await getClient().rpc("set_participation", { p_student: studentId, p_week: week, p_pts: pts })); }
export async function createMandatoryActivity(a: { week: number; title: string; description?: string; instructions?: string; materials?: string; points?: number; evidence_required?: boolean; due_at?: string }) { unwrap(await getClient().from("mandatory_activities").insert(a)); }
export async function markActivityDone(activityId: string, studentId: string, points: number, evidence?: string) {
  unwrap(await getClient().from("activity_completions").upsert({ activity_id: activityId, student_id: studentId, points, evidence: evidence ?? null }));
}
export async function saveIntegrationActivity(a: IntegrationActivity) { unwrap(await getClient().from("integration_activities").upsert(a)); }
export async function assignIntegration(week: number, studentId: string) { unwrap(await getClient().from("integration_assignments").upsert({ week, student_id: studentId })); }
/** El maestro de la lección SIGUIENTE registra quién participó: el servidor suma la CORONA. */
export async function registerParticipation(week: number, studentId: string) { unwrap(await getClient().from("integration_participations").insert({ week, student_id: studentId })); }
export async function crownsOf(): Promise<Crown[]> { return myCrowns(); }
