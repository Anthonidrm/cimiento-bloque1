export type Role = "ADMINISTRADOR" | "PASTOR" | "MAESTRO" | "ESTUDIANTE";
export type AttendanceStatus = "PRESENTE" | "AUSENTE" | "EXCUSA";

export interface Profile { id: string; username: string; display_name: string; role: Role; active: boolean; must_change_password: boolean }
export interface LessonRow { week: number; title: string | null; module_id: number; module_title: string; developed: boolean; teacher_id: string | null; teacher_name: string | null; assigned_at: string | null; assignment_status: string | null; days_late: number | null }
export interface TeacherProgress { week: number; teacher_id: string; teacher_name: string; guide_pts: number; exam_pts: number; presentation_pts: number; mandatory_pts: number; total_pts: number; guide_done: number; exam_completed: boolean; mandatory_done: number; mandatory_total: number; last_activity: string | null; assignment_status: string | null; days_late: number | null }
export interface StudentProgress { student_id: string; student_name: string; week: number; attendance_pts: number; submission_pts: number; participation_pts: number; exam_pts: number; total: number; crowns: number; last_activity: string }
export interface SessionRow { id: string; week: number; group_id: string | null; teacher_id: string; teacher_name: string; started_at: string; ended_at: string | null; status: "EN_CURSO" | "FINALIZADA"; duration_seconds: number | null; present: number; absent: number; excused: number; has_report: boolean }
export interface Task { id: string; week: number; title: string; description: string | null; opens_at: string; closes_at: string }
export interface Submission { id: string; assignment_id: string; student_id: string; kind: "DOCUMENTO" | "IMAGEN" | "ENLACE"; storage_path: string | null; url: string | null; submitted_at: string; teacher_comment: string | null; grade: number | null }
export interface MandatoryActivity { id: string; week: number; title: string; description: string | null; instructions: string | null; materials: string | null; points: number; evidence_required: boolean; due_at: string | null }
export interface IntegrationActivity { week: number; title: string; description: string | null; instructions: string | null; materials: string | null; points: number; evidence: string | null }
export interface Crown { id: string; student_id: string; week: number; reason: string; awarded_at: string }
export interface Game { id: string; week: number; kind: string; title: string; config: Record<string, unknown>; active: boolean; counts_as_exam: boolean; max_score: number }
export interface ResourceRow { id: string; week: number; kind: string; slot: string; title: string; audience: "MAESTRO" | "ESTUDIANTE" | "TODOS"; current?: { id: string; storage_path: string; filename: string; uploaded_at: string } }
export interface PhotoRow { id: string; week: number; session_id: string | null; storage_path: string; caption: string | null; uploaded_at: string; url?: string }
export interface NotificationRow { id: string; kind: string; title: string; body: string | null; payload: Record<string, unknown>; created_at: string; read_at: string | null }
export interface ClassReport { session_id: string; content: Record<string, unknown>; created_at: string; sent_to_pastor: string | null; sent_to_admin: string | null }
export interface Group { id: string; name: string; age_range: string | null }
