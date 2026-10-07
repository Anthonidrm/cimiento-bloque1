// Actividades obligatorias DEL MAESTRO en una lección (15 % de su preparación):
//   1) inicio y finalización de clase (las hizo él mismo)   2) pase de lista completo
// La fuente de verdad es el servidor (teacher_prep); aquí solo se guarda una COPIA (caché) de lo que el servidor dijo, para
// que el porcentaje se pueda calcular de inmediato. Sin backend no hay clases ni listas, así que ninguna está hecha.
// (No incluye las actividades de integración ni las "actividades de la lección" de los estudiantes.)
import { readJSON, writeJSON } from "../utils/storage";
import { getCurrentUserId } from "../auth/session";

export interface TeacherDuties {
  /** El maestro asignado inició y finalizó la clase él mismo. */
  classDone: boolean;
  /** El maestro registró la asistencia de todos los estudiantes de la lista de la clase. */
  attendanceDone: boolean;
}

const keyFor = (userId: string, week: number) => `cimiento:teacher-duties:${userId}:${week}`;

export function getTeacherDuties(week: number, userId: string = getCurrentUserId()): TeacherDuties {
  const s = readJSON<Partial<TeacherDuties> | null>(keyFor(userId, week), null);
  return { classDone: s?.classDone === true, attendanceDone: s?.attendanceDone === true };
}

export function saveTeacherDuties(week: number, duties: TeacherDuties, userId: string = getCurrentUserId()): void {
  writeJSON(keyFor(userId, week), { classDone: duties.classDone === true, attendanceDone: duties.attendanceDone === true });
}
