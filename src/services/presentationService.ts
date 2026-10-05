// Uso REAL de la presentación por maestro y lección (localStorage por ahora).
// Se registra por diapositiva: segundos con la diapositiva en pantalla (pestaña visible) y cada visita.
// Cuando existan las sesiones de clase (backend), cada registro se vinculará a la sesión.
import { getCurrentUserId } from "../auth/session";
import { readJSON, writeJSON } from "../utils/storage";
import { PRESENTATION_CONFIG } from "../config/presentationConfig";

export interface SlideVisit {
  slide: number;
  enteredAt: string;
  leftAt: string;
  seconds: number;
}

export interface PresentationUsage {
  userId: string;
  week: number;
  /** diapositiva → segundos acumulados */
  seconds: Record<number, number>;
  visits: SlideVisit[];
  updatedAt: string;
}

const keyFor = (userId: string, week: number) => `cimiento:presentation-use:${userId}:${week}`;

export function loadUsage(week: number, userId: string = getCurrentUserId()): PresentationUsage {
  return readJSON<PresentationUsage>(keyFor(userId, week), { userId, week, seconds: {}, visits: [], updatedAt: new Date().toISOString() });
}

export function addSlideSeconds(week: number, slide: number, secs: number, userId: string = getCurrentUserId()): PresentationUsage {
  const u = loadUsage(week, userId);
  u.seconds[slide] = (u.seconds[slide] ?? 0) + secs;
  u.updatedAt = new Date().toISOString();
  writeJSON(keyFor(userId, week), u);
  return u;
}

export function addVisit(week: number, visit: SlideVisit, userId: string = getCurrentUserId()): void {
  if (visit.seconds <= 0) return;
  const u = loadUsage(week, userId);
  u.visits.push(visit);
  writeJSON(keyFor(userId, week), u);
}

export interface UsageSummary {
  slidesUsed: number;
  total: number;
  fraction: number; // 0..1
  totalSeconds: number;
}

export function summarize(u: PresentationUsage): UsageSummary {
  const total = PRESENTATION_CONFIG.slideCount;
  let used = 0, totalSeconds = 0;
  for (let i = 1; i <= total; i++) {
    const s = u.seconds[i] ?? 0;
    totalSeconds += s;
    if (s >= PRESENTATION_CONFIG.minSecondsPerSlide) used++;
  }
  return { slidesUsed: used, total, fraction: total ? used / total : 0, totalSeconds };
}

export function getPresentationUsage(week: number, userId?: string): UsageSummary {
  return summarize(loadUsage(week, userId));
}
