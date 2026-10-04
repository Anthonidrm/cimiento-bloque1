// Estado del examen del maestro por semana, guardado en localStorage.
// A partir de la Fase 4.1: se conserva el HISTORIAL COMPLETO de cada
// intento por pregunta (no solo el último). Ningún intento se borra al
// responder de nuevo — se agrega un registro nuevo con su propio número
// de intento y fecha. Aislado en un servicio: cuando exista backend,
// solo esta implementación cambia.
import { getCurrentUserId } from "../auth/session";
import { getWeek } from "../data/weeks";

const KEY_PREFIX = "cimiento:exam:";

export interface AttemptRecord {
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  attemptNumber: number;
  answeredAt: string; // ISO date
}

/** Foto de la puntuación tras cada respuesta (puntuación + fecha + intento global). */
export interface ScoreSnapshot {
  at: string;
  answered: number;
  correct: number;
  scorePercent: number;
}

export interface ExamState {
  // questionId -> lista de intentos, en orden cronológico
  history: Record<string, AttemptRecord[]>;
  scoreHistory?: ScoreSnapshot[];
}

// El examen es POR USUARIO: cada maestro tiene su propio historial.
function keyFor(week: number) {
  return `${KEY_PREFIX}${getCurrentUserId()}:${week}`;
}

export function getExamState(week: number): ExamState {
  try {
    const raw = localStorage.getItem(keyFor(week));
    if (!raw) return { history: {} };
    const parsed = JSON.parse(raw);
    // Migración silenciosa desde el formato anterior (Fase 4), que
    // guardaba solo el último intento en `answers`. Si se detecta,
    // se convierte a un historial de un solo registro por pregunta
    // en vez de perder el dato.
    if (parsed && parsed.answers && !parsed.history) {
      const history: Record<string, AttemptRecord[]> = {};
      Object.entries(parsed.answers as Record<string, any>).forEach(([qId, a]) => {
        history[qId] = [
          {
            selectedOptionId: a.selectedOptionId,
            correctOptionId: a.correctOptionId,
            isCorrect: a.isCorrect,
            attemptNumber: a.attempts ?? 1,
            answeredAt: a.lastAnsweredAt ?? new Date().toISOString(),
          },
        ];
      });
      return { history };
    }
    return parsed && parsed.history ? parsed : { history: {} };
  } catch {
    return { history: {} };
  }
}

function saveState(week: number, state: ExamState) {
  try {
    localStorage.setItem(keyFor(week), JSON.stringify(state));
  } catch {
    // almacenamiento no disponible — se ignora
  }
}

/** Registra un nuevo intento SIN eliminar los anteriores. */
export function answerQuestion(
  week: number,
  questionId: string,
  selectedOptionId: string,
  correctOptionId: string
): ExamState {
  const state = getExamState(week);
  const prior = state.history[questionId] ?? [];
  const record: AttemptRecord = {
    selectedOptionId,
    correctOptionId,
    isCorrect: selectedOptionId === correctOptionId,
    attemptNumber: prior.length + 1,
    answeredAt: new Date().toISOString(),
  };
  state.history[questionId] = [...prior, record];
  const total = getWeek(week)?.examQuestions.length ?? 0;
  const answered = Object.keys(state.history).length;
  const correct = Object.values(state.history).filter(
    (list) => list.length > 0 && list[list.length - 1].isCorrect
  ).length;
  state.scoreHistory = [
    ...(state.scoreHistory ?? []),
    {
      at: record.answeredAt,
      answered,
      correct,
      scorePercent: total ? Math.round((correct / total) * 100) : 0,
    },
  ];
  saveState(week, state);
  return state;
}

/** Último intento registrado para una pregunta (define el estado "actual"). */
export function getLatestAttempt(week: number, questionId: string): AttemptRecord | undefined {
  const list = getExamState(week).history[questionId];
  return list && list.length > 0 ? list[list.length - 1] : undefined;
}

export function getAttemptCount(week: number, questionId: string): number {
  return getExamState(week).history[questionId]?.length ?? 0;
}

export function getExamScore(week: number, totalQuestions: number): number {
  if (totalQuestions === 0) return 0;
  const state = getExamState(week);
  const correct = Object.keys(state.history).filter((qId) => {
    const list = state.history[qId];
    return list.length > 0 && list[list.length - 1].isCorrect;
  }).length;
  return Math.round((correct / totalQuestions) * 100);
}

export function getAnsweredCount(week: number): number {
  return Object.keys(getExamState(week).history).length;
}

export function isExamComplete(week: number, totalQuestions: number): boolean {
  return getAnsweredCount(week) >= totalQuestions && totalQuestions > 0;
}

export interface MissedAttempt extends AttemptRecord {
  questionId: string;
}

/**
 * Todos los intentos INCORRECTOS de todas las preguntas, a través de
 * todo el historial (no solo el intento más reciente). Es la base de
 * la pantalla de revisión de errores.
 */
export function getAllMissedAttempts(week: number): MissedAttempt[] {
  const state = getExamState(week);
  const result: MissedAttempt[] = [];
  Object.entries(state.history).forEach(([questionId, attempts]) => {
    attempts
      .filter((a) => !a.isCorrect)
      .forEach((a) => result.push({ questionId, ...a }));
  });
  return result.sort((a, b) => (a.answeredAt < b.answeredAt ? 1 : -1));
}

/** Resumen por pregunta: intentos totales, si está correcta actualmente, errores. */
export interface QuestionSummary {
  questionId: string;
  totalAttempts: number;
  currentlyCorrect: boolean;
  missedAttempts: AttemptRecord[];
}

export function getQuestionSummaries(week: number): QuestionSummary[] {
  const state = getExamState(week);
  return Object.entries(state.history).map(([questionId, attempts]) => ({
    questionId,
    totalAttempts: attempts.length,
    currentlyCorrect: attempts[attempts.length - 1]?.isCorrect ?? false,
    missedAttempts: attempts.filter((a) => !a.isCorrect),
  }));
}
