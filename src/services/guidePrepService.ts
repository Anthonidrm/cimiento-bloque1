// Progreso de preparación de la Guía del Maestro (desbloqueo secuencial).
//
// Reglas:
//  - Al comenzar solo el apartado 1 está disponible.
//  - Un apartado se completa cuando el maestro acumula al menos 30 segundos
//    con ese apartado abierto (solo cuenta el tiempo con la pestaña visible).
//  - Completar el apartado N desbloquea el N+1.
//  - El progreso se guarda por usuario y lección y se retoma al volver.
//
// Las funciones de cálculo son puras (reciben y devuelven el progreso) para
// poder probarlas; solo load/save tocan localStorage.
import { readJSON, writeJSON } from "../utils/storage";
import { getCurrentUserId } from "../auth/session";
import { GUIDE_SECTION_COUNT } from "../data/guideSections";

export const MIN_SECONDS_PER_SECTION = 30;

export interface SectionState {
  opened: boolean;
  seconds: number;
  completed: boolean;
  firstOpenedAt?: string;
  completedAt?: string;
}

/** Una visita continua a un apartado (entrada → salida). */
export interface VisitLog {
  userId: string;
  week: number;
  section: number;
  date: string; // AAAA-MM-DD
  enteredAt: string;
  leftAt: string;
  seconds: number;
  completed: boolean;
}

export interface GuideProgress {
  userId: string;
  week: number;
  sections: Record<number, SectionState>;
  log: VisitLog[];
  completedAt?: string;
  updatedAt: string;
}

const keyFor = (userId: string, week: number) => `cimiento:guide:${userId}:${week}`;

export function emptyProgress(userId: string, week: number): GuideProgress {
  return { userId, week, sections: {}, log: [], updatedAt: new Date().toISOString() };
}

export function loadProgress(week: number, userId: string = getCurrentUserId()): GuideProgress {
  const p = readJSON<GuideProgress | null>(keyFor(userId, week), null);
  return p && p.sections ? p : emptyProgress(userId, week);
}

export function saveProgress(p: GuideProgress): void {
  writeJSON(keyFor(p.userId, p.week), p);
}

export function completedCount(p: GuideProgress): number {
  let n = 0;
  for (let i = 1; i <= GUIDE_SECTION_COUNT; i++) if (p.sections[i]?.completed) n++;
  return n;
}

export function isUnlocked(p: GuideProgress, n: number): boolean {
  return n === 1 || !!p.sections[n - 1]?.completed;
}

export function isOpened(p: GuideProgress, n: number): boolean {
  return !!p.sections[n]?.opened;
}

/** Apartado que está acumulando tiempo: desbloqueado, abierto y no completado. */
export function activeSection(p: GuideProgress): number | null {
  for (let i = 1; i <= GUIDE_SECTION_COUNT; i++) {
    if (isUnlocked(p, i) && isOpened(p, i) && !p.sections[i]?.completed) return i;
  }
  return null;
}

export function allCompleted(p: GuideProgress): boolean {
  return completedCount(p) === GUIDE_SECTION_COUNT;
}

export function guidePercent(p: GuideProgress): number {
  return Math.round((completedCount(p) / GUIDE_SECTION_COUNT) * 100);
}

export function openSection(p: GuideProgress, n: number, nowISO: string): GuideProgress {
  if (n < 1 || n > GUIDE_SECTION_COUNT || !isUnlocked(p, n) || isOpened(p, n)) return p;
  const prev = p.sections[n];
  return {
    ...p,
    sections: {
      ...p.sections,
      [n]: { opened: true, seconds: prev?.seconds ?? 0, completed: false, firstOpenedAt: nowISO },
    },
    updatedAt: nowISO,
  };
}

/** Suma tiempo al apartado activo; lo completa al llegar a 30 s. */
export function addSeconds(p: GuideProgress, n: number, secs: number, nowISO: string): GuideProgress {
  const s = p.sections[n];
  if (!s || !s.opened || s.completed || !isUnlocked(p, n) || secs <= 0) return p;
  const seconds = s.seconds + secs;
  const completed = seconds >= MIN_SECONDS_PER_SECTION;
  const next: GuideProgress = {
    ...p,
    sections: {
      ...p.sections,
      [n]: { ...s, seconds, completed, completedAt: completed ? nowISO : s.completedAt },
    },
    updatedAt: nowISO,
  };
  if (allCompleted(next) && !next.completedAt) next.completedAt = nowISO;
  return next;
}

export function appendVisit(p: GuideProgress, v: VisitLog): GuideProgress {
  if (v.seconds <= 0) return p;
  return { ...p, log: [...p.log, v] };
}
