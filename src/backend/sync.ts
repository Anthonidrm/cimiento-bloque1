// Sincronización de la PREPARACIÓN del maestro (guía, examen, presentación) con el servidor.
//
// - Escritura: lo que el maestro hace se envía al servidor (por lotes para el tiempo; de inmediato para el examen).
//   El servidor valida (secuencia de la guía, un solo intento del examen, tiempos razonables) y es la fuente de verdad
//   que ven el Pastor y el Administrador.
// - Lectura: al iniciar sesión se recupera lo guardado en el servidor y se funde con la copia local (el servidor gana
//   en el examen). Así el progreso sigue al maestro entre dispositivos.
// - La copia local (localStorage) es solo CACHÉ de la pantalla del propio maestro; no es la fuente de verdad.
// Sin backend, nada de esto se ejecuta y la app funciona en modo local como antes.
import { isBackendConfigured } from "./config";
import { getSession } from "../auth/session";
import { guideAddSeconds, myGuideProgress, myExam, myPresentationUsage, presentationAddSeconds, examAnswer, myTeacherDuties, type ExamAnswerResult } from "./prep";
import { loadProgress, saveProgress, emptyProgress } from "../services/guidePrepService";
import { getExamState, saveExamState, type ExamAttempt, type AttemptRecord } from "../services/examService";
import { loadUsage, saveUsage } from "../services/presentationService";
import { saveTeacherDuties } from "../services/mandatoryService";
import { getAllWeeks } from "../services/weekService";
import type { ExamQuestion } from "../data/weekTypes";

export interface SyncStatus { pendingSeconds: number; lastError: string | null; lastOkAt: string | null }
const status: SyncStatus = { pendingSeconds: 0, lastError: null, lastOkAt: null };
export const getSyncStatus = (): SyncStatus => ({ ...status });

/** ¿Hay una sesión de Supabase activa? (solo entonces se sincroniza) */
export function syncActive(): boolean {
  return isBackendConfigured() && getSession()?.source === "supabase";
}

// ---------- Tiempo de guía y presentación: se acumula y se envía por lotes (el servidor admite ≤ 60 s por llamada) ----------
interface Pending { kind: "guide" | "pres"; week: number; idx: number; secs: number; session?: string }
const queue = new Map<string, Pending>();
let timer: ReturnType<typeof setInterval> | null = null;
const FLUSH_MS = 10_000;

function enqueue(p: Pending) {
  const k = `${p.kind}:${p.week}:${p.idx}:${p.session ?? ""}`;
  const cur = queue.get(k);
  if (cur) cur.secs += p.secs; else queue.set(k, p);
  status.pendingSeconds += p.secs;
  if (!timer && typeof setInterval !== "undefined") timer = setInterval(() => void flushQueue(), FLUSH_MS);
}

export function queueGuideSeconds(week: number, section: number, secs = 1) {
  if (syncActive()) enqueue({ kind: "guide", week, idx: section, secs });
}
export function queuePresentationSeconds(week: number, slide: number, secs = 1, session?: string) {
  if (syncActive()) enqueue({ kind: "pres", week, idx: slide, secs, session });
}

/** Envía lo pendiente. Si el servidor rechaza un lote (p. ej. guía fuera de secuencia) se registra el error y se descarta. */
export async function flushQueue(): Promise<void> {
  const items = [...queue.values()];
  queue.clear();
  for (const it of items) {
    let left = it.secs;
    while (left > 0) {
      const chunk = Math.min(left, 60);
      try {
        if (it.kind === "guide") await guideAddSeconds(it.week, it.idx, chunk);
        else await presentationAddSeconds(it.week, it.idx, chunk, it.session);
        status.lastOkAt = new Date().toISOString();
        status.lastError = null;
      } catch (e) {
        status.lastError = (e as Error).message;
        break;
      } finally {
        status.pendingSeconds = Math.max(0, status.pendingSeconds - chunk);
      }
      left -= chunk;
    }
  }
}

// ---------- Examen: el SERVIDOR califica y registra (primera respuesta definitiva, un solo intento) ----------
export async function pushExamAnswer(week: number, q: ExamQuestion, value: { optionId: string } | { pairs: Record<string, string> }): Promise<ExamAnswerResult | null> {
  if (!syncActive()) return null;
  try {
    const r = await examAnswer(week, q.id, "optionId" in value ? value.optionId : undefined, "pairs" in value ? value.pairs : undefined);
    status.lastOkAt = new Date().toISOString();
    status.lastError = null;
    return r;
  } catch (e) {
    status.lastError = (e as Error).message;
    return null;
  }
}

// ---------- Recuperar del servidor al iniciar sesión ----------
export async function hydrateWeek(week: number): Promise<void> {
  if (!syncActive()) return;
  const userId = getSession()!.userId;

  // Guía: gana el mayor tiempo y "completado" si cualquiera de los dos lo tiene.
  const g = await myGuideProgress(week);
  if (g.length) {
    const local = loadProgress(week, userId) ?? emptyProgress(userId, week);
    for (const row of g) {
      const cur = local.sections[row.section] ?? { opened: false, seconds: 0, completed: false };
      const completed = cur.completed || row.completed_at !== null;
      local.sections[row.section] = {
        ...cur,
        opened: cur.opened || row.seconds > 0,
        seconds: Math.max(cur.seconds, row.seconds),
        completed,
        completedAt: cur.completedAt ?? row.completed_at ?? undefined,
      };
    }
    saveProgress(local);
  }

  // Examen: el servidor manda (un solo intento; la primera respuesta es definitiva).
  const { attempt, answers } = await myExam(week);
  if (attempt) {
    const state = getExamState(week);
    const recs: Record<string, AttemptRecord> = {};
    for (const a of answers) {
      recs[a.question_id] = { selectedOptionId: a.selected_option ?? undefined, pairs: a.pairs ?? undefined, isCorrect: a.is_correct, attemptNumber: 1, answeredAt: a.answered_at };
    }
    const merged: ExamAttempt = {
      number: 1,
      startedAt: attempt.started_at,
      completedAt: attempt.completed_at ?? undefined,
      scorePercent: attempt.score_percent ?? undefined,
      answers: { ...(state.attempts[0]?.answers ?? {}), ...recs },
    };
    saveExamState(week, { ...state, attempts: [merged] });
  }

  // Presentación: gana el mayor tiempo por diapositiva.
  const p = await myPresentationUsage(week);
  if (p.length) {
    const u = loadUsage(week, userId);
    for (const row of p) u.seconds[row.slide] = Math.max(u.seconds[row.slide] ?? 0, row.seconds);
    saveUsage(u);
  }

  await refreshDuties(week);
}

/** Actividades obligatorias del maestro (inicio/fin de clase y pase de lista; 15 % de la preparación): recupera lo que dice el servidor. */
export async function refreshDuties(week: number): Promise<void> {
  if (!syncActive()) return;
  const userId = getSession()!.userId;
  try {
    saveTeacherDuties(week, await myTeacherDuties(userId, week), userId);
  } catch (e) {
    status.lastError = (e as Error).message;
  }
}

export async function hydrateAll(): Promise<void> {
  if (!syncActive()) return;
  const weeks = getAllWeeks().filter((w) => w.status === "developed").map((w) => w.week);
  await Promise.all(weeks.map((w) => hydrateWeek(w).catch((e) => { status.lastError = (e as Error).message; })));
}
