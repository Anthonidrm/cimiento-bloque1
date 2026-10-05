// Estado del examen del maestro, por usuario y semana (localStorage por ahora;
// cuando exista backend solo cambia esta implementación).
//
// Reglas:
//  - El examen se hace por INTENTOS (EXAM_CONFIG.maxAttempts).
//  - Dentro de un intento, la PRIMERA respuesta a cada pregunta queda registrada
//    y no se puede cambiar.
//  - Un intento termina al responder todas las preguntas.
//  - La calificación que cuenta depende de EXAM_CONFIG.scoring.
//  - Ningún dato se borra: todos los intentos y errores quedan en el historial.
import { getCurrentUserId } from "../auth/session";
import { getWeek } from "../data/weeks";
import { EXAM_CONFIG } from "../config/examConfig";
import type { ExamQuestion } from "../data/weekTypes";

const KEY_PREFIX = "cimiento:exam:";

/** Respuesta registrada a una pregunta dentro de un intento del examen. */
export interface AttemptRecord {
  selectedOptionId?: string;
  /** Solo preguntas de relación: elemento de la izquierda → elegido a la derecha. */
  pairs?: Record<string, string>;
  correctOptionId?: string;
  isCorrect: boolean;
  /** Número de intento del EXAMEN (no de la pregunta). */
  attemptNumber: number;
  answeredAt: string; // ISO
}

export interface ExamAttempt {
  number: number;
  startedAt: string;
  completedAt?: string;
  answers: Record<string, AttemptRecord>;
  scorePercent?: number;
}

/** Foto de la puntuación tras cada respuesta. */
export interface ScoreSnapshot {
  at: string;
  attemptNumber: number;
  answered: number;
  correct: number;
  scorePercent: number;
}

export interface ExamState {
  version: 2;
  attempts: ExamAttempt[];
  scoreHistory: ScoreSnapshot[];
  /** Datos del formato anterior conservados por trazabilidad (no se usan en la nota). */
  legacy?: unknown;
}

const keyFor = (week: number) => `${KEY_PREFIX}${getCurrentUserId()}:${week}`;
const totalOf = (week: number) => getWeek(week)?.examQuestions.length ?? 0;
const emptyState = (): ExamState => ({ version: 2, attempts: [], scoreHistory: [] });
const correctCount = (a: ExamAttempt) => Object.values(a.answers).filter((r) => r.isCorrect).length;
const percent = (correct: number, total: number) => (total ? Math.round((correct / total) * 100) : 0);

export function getExamState(week: number): ExamState {
  try {
    const raw = localStorage.getItem(keyFor(week));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (parsed?.version === 2 && Array.isArray(parsed.attempts)) return parsed as ExamState;
    // Migración desde el formato anterior (historial por pregunta): se conserva la PRIMERA
    // respuesta de cada pregunta como intento 1; el resto queda en `legacy`.
    if (parsed?.history) {
      const answers: Record<string, AttemptRecord> = {};
      let first = "";
      Object.entries(parsed.history as Record<string, AttemptRecord[]>).forEach(([qid, list]) => {
        if (!list?.length) return;
        answers[qid] = { ...list[0], attemptNumber: 1 };
        if (!first || list[0].answeredAt < first) first = list[0].answeredAt;
      });
      const total = totalOf(week);
      const attempt: ExamAttempt = { number: 1, startedAt: first || new Date().toISOString(), answers };
      if (total > 0 && Object.keys(answers).length >= total) {
        attempt.completedAt = new Date().toISOString();
        attempt.scorePercent = percent(correctCount(attempt), total);
      }
      return { version: 2, attempts: Object.keys(answers).length ? [attempt] : [], scoreHistory: [], legacy: parsed.history };
    }
    return emptyState();
  } catch {
    return emptyState();
  }
}

function saveState(week: number, state: ExamState) {
  try {
    localStorage.setItem(keyFor(week), JSON.stringify(state));
  } catch {
    // almacenamiento no disponible — se ignora
  }
}

export function getCurrentAttempt(week: number): ExamAttempt | undefined {
  const a = getExamState(week).attempts;
  return a[a.length - 1];
}

export function getAttemptsUsed(week: number): number {
  return getExamState(week).attempts.length;
}

/** ¿Puede empezarse un intento nuevo? (no hay uno abierto y quedan intentos). */
export function canStartNewAttempt(week: number): boolean {
  const { attempts } = getExamState(week);
  if (attempts.length === 0) return true;
  return !!attempts[attempts.length - 1].completedAt && attempts.length < EXAM_CONFIG.maxAttempts;
}

export function startAttempt(week: number): ExamAttempt | undefined {
  if (!canStartNewAttempt(week)) return undefined;
  const state = getExamState(week);
  const attempt: ExamAttempt = { number: state.attempts.length + 1, startedAt: new Date().toISOString(), answers: {} };
  state.attempts.push(attempt);
  saveState(week, state);
  return attempt;
}

export type AnswerValue = { optionId: string } | { pairs: Record<string, string> };

export type AnswerResult = { ok: true; record: AttemptRecord } | { ok: false; reason: string };

/** Evalúa una respuesta (sin guardarla). */
export function gradeAnswer(q: ExamQuestion, value: AnswerValue): boolean {
  if (q.type === "matching") {
    const chosen = "pairs" in value ? value.pairs : {};
    return !!q.pairs && q.pairs.length > 0 && q.pairs.every((p) => chosen[p.left] === p.right);
  }
  return "optionId" in value && value.optionId === q.correctOptionId;
}

/**
 * Registra la respuesta a una pregunta en el intento actual (lo abre si no hay).
 * Si la pregunta ya fue respondida en ese intento, NO se cambia: la primera respuesta queda.
 */
export function answerQuestion(week: number, q: ExamQuestion, value: AnswerValue): AnswerResult {
  const state = getExamState(week);
  if (state.attempts.length === 0) {
    state.attempts.push({ number: 1, startedAt: new Date().toISOString(), answers: {} });
  }
  const attempt = state.attempts[state.attempts.length - 1];
  if (attempt.completedAt) return { ok: false, reason: "Este intento ya terminó." };
  if (attempt.answers[q.id]) return { ok: false, reason: "Esta pregunta ya fue respondida; la respuesta registrada no se puede cambiar." };
  if (q.type === "matching") {
    const chosen = "pairs" in value ? value.pairs : {};
    if (!q.pairs || !q.pairs.every((p) => chosen[p.left])) return { ok: false, reason: "Relaciona todos los elementos antes de confirmar." };
  } else if (!("optionId" in value) || !q.options.some((o) => o.id === value.optionId)) {
    return { ok: false, reason: "Opción no válida." };
  }
  const now = new Date().toISOString();
  const record: AttemptRecord = {
    ...(q.type === "matching"
      ? { pairs: (value as { pairs: Record<string, string> }).pairs }
      : { selectedOptionId: (value as { optionId: string }).optionId, correctOptionId: q.correctOptionId }),
    isCorrect: gradeAnswer(q, value),
    attemptNumber: attempt.number,
    answeredAt: now,
  };
  attempt.answers[q.id] = record;
  const total = totalOf(week);
  const answered = Object.keys(attempt.answers).length;
  const correct = correctCount(attempt);
  state.scoreHistory.push({ at: now, attemptNumber: attempt.number, answered, correct, scorePercent: percent(correct, total) });
  if (total > 0 && answered >= total) {
    attempt.completedAt = now;
    attempt.scorePercent = percent(correct, total);
  }
  saveState(week, state);
  return { ok: true, record };
}

/** Calificación que cuenta (según EXAM_CONFIG.scoring) entre los intentos COMPLETADOS. */
export function getExamScore(week: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  const done = getExamState(week).attempts.filter((a) => a.completedAt);
  if (done.length === 0) return 0;
  const scores = done.map((a) => percent(correctCount(a), totalQuestions));
  if (EXAM_CONFIG.scoring === "first") return scores[0];
  if (EXAM_CONFIG.scoring === "latest") return scores[scores.length - 1];
  return Math.max(...scores);
}

/** Puntuación del intento en curso (o del último). */
export function getCurrentAttemptScore(week: number, totalQuestions: number): number {
  const a = getCurrentAttempt(week);
  return a ? percent(correctCount(a), totalQuestions) : 0;
}

export function getAnsweredCount(week: number): number {
  const a = getCurrentAttempt(week);
  return a ? Object.keys(a.answers).length : 0;
}

/** El examen cuenta como realizado cuando hay al menos un intento completado. */
export function isExamComplete(week: number, totalQuestions: number): boolean {
  return totalQuestions > 0 && getExamState(week).attempts.some((a) => a.completedAt);
}

export interface MissedAttempt extends AttemptRecord {
  questionId: string;
}

/** Todas las respuestas incorrectas de todos los intentos (base de la revisión de errores). */
export function getAllMissedAttempts(week: number): MissedAttempt[] {
  const out: MissedAttempt[] = [];
  getExamState(week).attempts.forEach((a) =>
    Object.entries(a.answers).forEach(([questionId, r]) => {
      if (!r.isCorrect) out.push({ questionId, ...r });
    })
  );
  return out.sort((x, y) => (x.answeredAt < y.answeredAt ? 1 : -1));
}

export interface QuestionSummary {
  questionId: string;
  /** En cuántos intentos del examen se respondió esta pregunta. */
  totalAttempts: number;
  /** ¿La respuesta del intento más reciente fue correcta? */
  currentlyCorrect: boolean;
  missedAttempts: AttemptRecord[];
}

export function getQuestionSummaries(week: number): QuestionSummary[] {
  const byQ: Record<string, AttemptRecord[]> = {};
  getExamState(week).attempts.forEach((a) =>
    Object.entries(a.answers).forEach(([qid, r]) => {
      (byQ[qid] ??= []).push(r);
    })
  );
  return Object.entries(byQ).map(([questionId, list]) => ({
    questionId,
    totalAttempts: list.length,
    currentlyCorrect: list[list.length - 1].isCorrect,
    missedAttempts: list.filter((r) => !r.isCorrect),
  }));
}
