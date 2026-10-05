import { getClient, unwrap } from "./client";

export interface ExamAnswerResult { is_correct: boolean; correct_option: string | null; correct_pairs: { left: string; right: string }[] | null; answered: number; total: number; completed: boolean; score_percent: number | null }

/** El SERVIDOR califica y registra (primera respuesta definitiva, un solo intento). */
export async function examAnswer(week: number, question: string, option?: string, pairs?: Record<string, string>): Promise<ExamAnswerResult> {
  return unwrap(await getClient().rpc("exam_answer", { p_week: week, p_question: question, p_option: option ?? null, p_pairs: pairs ?? null })) as ExamAnswerResult;
}
export interface ExamAnswerRow { question_id: string; selected_option: string | null; pairs: Record<string, string> | null; is_correct: boolean; answered_at: string }
export async function myExam(week: number): Promise<{ attempt: { id: string; attempt_no: number; started_at: string; completed_at: string | null; score_percent: number | null } | null; answers: ExamAnswerRow[] }> {
  const attempts = unwrap(await getClient().from("exam_attempts").select("id, attempt_no, started_at, completed_at, score_percent").eq("week", week)) as { id: string; attempt_no: number; started_at: string; completed_at: string | null; score_percent: number | null }[];
  if (!attempts.length) return { attempt: null, answers: [] };
  const answers = unwrap(await getClient().from("exam_answers").select("question_id, selected_option, pairs, is_correct, answered_at").eq("attempt_id", attempts[0].id)) as ExamAnswerRow[];
  return { attempt: attempts[0], answers };
}
export async function guideAddSeconds(week: number, section: number, secs: number) {
  return unwrap(await getClient().rpc("guide_add_seconds", { p_week: week, p_section: section, p_secs: secs })) as { seconds: number; completed: boolean; sections_done: number; sections_total: number };
}
export async function myGuideProgress(week: number) {
  return unwrap(await getClient().from("guide_progress").select("section, seconds, completed_at").eq("week", week)) as { section: number; seconds: number; completed_at: string | null }[];
}
export async function presentationAddSeconds(week: number, slide: number, secs: number, sessionId?: string) {
  return unwrap(await getClient().rpc("presentation_add_seconds", { p_week: week, p_slide: slide, p_secs: secs, p_session: sessionId ?? null })) as number;
}
export async function myPresentationUsage(week: number) {
  return unwrap(await getClient().from("presentation_usage").select("slide, seconds").eq("week", week)) as { slide: number; seconds: number }[];
}
/** Preparación calculada por el servidor (50 guía · 30 examen · 20 presentación). */
export async function myPrep(userId: string, week: number) {
  const rows = unwrap(await getClient().rpc("teacher_prep", { p_user: userId, p_week: week })) as { guide_pts: number; exam_pts: number; presentation_pts: number; total_pts: number; guide_done: number; exam_completed: boolean }[];
  return rows[0];
}
