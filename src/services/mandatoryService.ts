// Actividades obligatorias del MAESTRO en una lección: cuántas tiene la lección y cuántas registró él en clase.
// La fuente de verdad es el servidor (activity_completions); aquí solo se guarda una COPIA (caché) de lo que el servidor
// dijo, para que el porcentaje de preparación se pueda calcular de inmediato. Sin backend no existen actividades
// obligatorias (no se pueden definir ni registrar), así que la copia es { total: 0 }.
import { readJSON, writeJSON } from "../utils/storage";
import { getCurrentUserId } from "../auth/session";

export interface MandatoryStats {
  /** Actividades obligatorias definidas para la lección. */
  total: number;
  /** Cuántas de ellas registró este maestro (al menos un cumplimiento a su nombre). */
  done: number;
}

const keyFor = (userId: string, week: number) => `cimiento:mandatory:${userId}:${week}`;

export function getMandatoryStats(week: number, userId: string = getCurrentUserId()): MandatoryStats {
  const s = readJSON<MandatoryStats | null>(keyFor(userId, week), null);
  return s && Number.isFinite(s.total) && Number.isFinite(s.done) ? { total: s.total, done: Math.min(s.done, s.total) } : { total: 0, done: 0 };
}

export function saveMandatoryStats(week: number, stats: MandatoryStats, userId: string = getCurrentUserId()): void {
  writeJSON(keyFor(userId, week), { total: Math.max(0, stats.total), done: Math.max(0, Math.min(stats.done, stats.total)) });
}
