import { getClient, unwrap } from "./client";
import type { LessonRow, StudentProgress, TeacherProgress } from "./types";

/** Lecciones con MAESTRO ASIGNADO (nombre) y estado de la asignación (A_TIEMPO, FUERA_DE_TIEMPO, ATRASADA…). */
export async function listLessons(): Promise<LessonRow[]> {
  return unwrap(await getClient().from("v_lessons").select("*").order("week")) as LessonRow[];
}

/** Asigna o cambia el maestro de una lección. Quién y cuándo lo registra el servidor. */
export async function assignTeacher(week: number, teacherId: string) {
  unwrap(await getClient().from("teacher_assignments").upsert({ week, teacher_id: teacherId }, { onConflict: "week" }));
}
export async function unassignTeacher(week: number) {
  unwrap(await getClient().from("teacher_assignments").delete().eq("week", week));
}
export async function assignmentHistory(week?: number) {
  let q = getClient().from("teacher_assignment_history").select("*").order("done_at", { ascending: false });
  if (week) q = q.eq("week", week);
  return unwrap(await q) as { id: string; week: number; teacher_id: string | null; action: string; done_by: string; done_at: string }[];
}

export async function teacherProgress(): Promise<TeacherProgress[]> { return unwrap(await getClient().from("v_teacher_progress").select("*").order("week")) as TeacherProgress[]; }
export async function studentProgress(): Promise<StudentProgress[]> { return unwrap(await getClient().from("v_student_progress").select("*").order("week")) as StudentProgress[]; }
