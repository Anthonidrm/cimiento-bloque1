// Modelos preparados para las PRÓXIMAS FASES (ver docs/PENDIENTES_PROXIMAS_FASES.md).
// NO están conectados a la aplicación todavía: solo fijan la forma de los datos
// para que cuando se implementen no obliguen a reescribir la arquitectura actual.
import type { Role } from "../auth/types";

export interface ClassSession {
  id: string;
  week: number;
  teacherId: string;
  startedAt?: string; // inicio de clase
  endedAt?: string; // finalización de clase
  timerSeconds?: number; // temporizador
  presentationUsed?: boolean;
}

export interface AttendanceRecord {
  sessionId: string;
  studentId: string;
  present: boolean;
  recordedBy: string;
}

/** Puntuación del estudiante por lección: 4 componentes de 25 puntos. */
export interface StudentLessonScore {
  studentId: string;
  week: number;
  attendance: number; // 0–25
  assignmentDelivery: number; // 0–25
  participation: number; // 0–25
  exam: number; // 0–25
  integrationScore?: number;
  crowns?: number;
}

export interface TeacherAssignment {
  week: number;
  teacherId: string;
  assignedAt: string;
  dueAt?: string; // control de entrega dentro de las 4 horas
  deliveredAt?: string;
  onTime?: boolean;
  delayMinutes?: number;
}

export interface ClassReport {
  sessionId: string;
  createdAt: string;
  sentToPastor?: string;
  sentToAdmin?: string;
  photos?: string[];
}

export interface ReplaceableResource {
  id: string;
  week: number;
  kind: "presentacion" | "hoja-trabajo" | "colorear" | "versiculo" | "guia" | "otro";
  url: string;
  replacedBy?: string;
  managedByRole: Extract<Role, "ADMINISTRADOR" | "PASTOR">;
}

export interface Notification {
  id: string;
  toUserId: string;
  message: string;
  channel: "app" | "whatsapp";
  createdAt: string;
}
