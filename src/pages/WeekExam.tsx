import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useWeekParam } from "../utils/weekParam";
import Breadcrumbs from "../components/Breadcrumbs";
import { getWeekByNumber } from "../services/weekService";
import {
  answerQuestion,
  canStartNewAttempt,
  getAttemptsUsed,
  getCurrentAttempt,
  getCurrentAttemptScore,
  getExamScore,
  isExamComplete,
  startAttempt,
  type AttemptRecord,
} from "../services/examService";
import { EXAM_CONFIG } from "../config/examConfig";
import type { ExamQuestion } from "../data/weekTypes";
import "./Course.css";
import "./WeekExam.css";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Selección múltiple",
  true_false: "Verdadero / Falso",
  comprehension: "Comprensión",
  scenario: "Situación práctica",
  pedagogical: "Aplicación pedagógica",
  doctrinal: "Doctrina",
  matching: "Relación",
};

const SCORING_TEXT: Record<string, string> = {
  first: "cuenta el primer intento completado",
  best: "cuenta el mejor intento completado",
  latest: "cuenta el último intento completado",
};

/** Orden estable (no aleatorio) de la columna derecha, distinto al de la izquierda. */
function rightColumn(q: ExamQuestion): string[] {
  const rights = (q.pairs ?? []).map((p) => p.right);
  return [...rights].sort((a, b) => a.localeCompare(b, "es"));
}

export default function WeekExam() {
  const week = useWeekParam();
  const lesson = getWeekByNumber(week);
  const [tick, setTick] = useState(0); // fuerza re-render tras registrar una respuesta
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [notice, setNotice] = useState("");

  if (!lesson) return <Navigate to="/plan-anual" replace />;
  if (lesson.status === "pending" || lesson.examQuestions.length === 0) {
    return <Navigate to="/plan-anual" replace />;
  }

  const total = lesson.examQuestions.length;
  const attempt = getCurrentAttempt(lesson.week);
  const answers: Record<string, AttemptRecord> = attempt?.answers ?? {};
  const attemptNumber = attempt?.number ?? 1;
  const attemptDone = !!attempt?.completedAt;
  const used = getAttemptsUsed(lesson.week);
  const canRetry = canStartNewAttempt(lesson.week) && used > 0;
  const counted = getExamScore(lesson.week, total);

  function register(q: ExamQuestion, value: Parameters<typeof answerQuestion>[2]) {
    const r = answerQuestion(lesson!.week, q, value);
    setNotice(r.ok ? "" : r.reason);
    setTick((t) => t + 1);
  }

  return (
    <div className="container page">
      <Breadcrumbs
        items={[
          { label: "Inicio", to: "/" },
          { label: "Plan Anual", to: "/plan-anual" },
          { label: `Semana ${lesson.week}`, to: `/plan-anual/semana-${lesson.week}` },
          { label: "Examen" },
        ]}
      />

      <header className="page-header">
        <p className="page-header__eyebrow">Semana {lesson.week} · {lesson.title}</p>
        <h1>Examen de preparación del maestro</h1>
        <p className="page-header__desc">
          Responde cada pregunta. Verás de inmediato si acertaste, con la respuesta correcta y la
          explicación. <strong>La primera respuesta que registres no se puede cambiar</strong> y
          cuenta en tu calificación, también si es incorrecta.{" "}
          {EXAM_CONFIG.maxAttempts === 1 ? (
            <strong>Este examen tiene un único intento.</strong>
          ) : (
            <>Tienes {EXAM_CONFIG.maxAttempts} intentos; {SCORING_TEXT[EXAM_CONFIG.scoring]}.</>
          )}{" "}
          Tus respuestas y errores quedan en tu historial.
        </p>
        <p className="exam-score-banner">
          {EXAM_CONFIG.maxAttempts === 1 ? "Intento único" : <>Intento <strong>{attemptNumber}</strong> de {EXAM_CONFIG.maxAttempts}</>}
          {attempt && !attemptDone && (
            <> · respondidas {Object.keys(answers).length} de {total}</>
          )}
          {isExamComplete(lesson.week, total) && (
            <> · Calificación que cuenta: <strong>{counted}%</strong></>
          )}
        </p>
      </header>

      {notice && <p className="exam-notice" role="alert">{notice}</p>}

      <ol className="exam-question-list" key={tick}>
        {lesson.examQuestions.map((q, i) => {
          const answer = answers[q.id];
          const locked = !!answer || attemptDone;
          return (
            <li key={q.id} className="exam-question">
              <div className="exam-question__head">
                <span className="exam-question__num">{i + 1}</span>
                <span className="exam-question__type">{TYPE_LABELS[q.type] ?? q.type}</span>
                {q.needsPastoralReview && <span className="exam-question__review">Pendiente de revisión pastoral</span>}
                {answer && <span className="exam-question__lock">🔒 respuesta registrada</span>}
              </div>
              <p className="exam-question__prompt">{q.prompt}</p>

              {q.type === "matching" ? (
                <div className="exam-match">
                  {(q.pairs ?? []).map((p) => {
                    const chosen = answer?.pairs?.[p.left] ?? draft[q.id]?.[p.left] ?? "";
                    const state = answer ? (chosen === p.right ? "is-correct" : "is-incorrect") : "";
                    return (
                      <div key={p.left} className={`exam-match__row ${state}`}>
                        <span className="exam-match__left">{p.left}</span>
                        <select
                          value={chosen}
                          disabled={locked}
                          aria-label={`Relación para: ${p.left}`}
                          onChange={(e) =>
                            setDraft((d) => ({ ...d, [q.id]: { ...d[q.id], [p.left]: e.target.value } }))
                          }
                        >
                          <option value="">— elige —</option>
                          {rightColumn(q).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                  {!locked && (
                    <button
                      type="button"
                      className="exam-match__confirm"
                      disabled={!(q.pairs ?? []).every((p) => draft[q.id]?.[p.left])}
                      onClick={() => register(q, { pairs: draft[q.id] ?? {} })}
                    >
                      Confirmar relación
                    </button>
                  )}
                </div>
              ) : (
                <div className="exam-question__options">
                  {q.options.map((opt) => {
                    const isSelected = answer?.selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={locked}
                        className={`exam-option ${isSelected ? "is-selected" : ""} ${
                          isSelected ? (answer!.isCorrect ? "is-correct" : "is-incorrect") : ""
                        }`}
                        onClick={() => register(q, { optionId: opt.id })}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              )}

              {answer && (
                <div className={`exam-feedback ${answer.isCorrect ? "is-correct" : "is-incorrect"}`}>
                  <p className="exam-feedback__verdict">{answer.isCorrect ? "✓ Correcto" : "✗ Incorrecto"}</p>
                  {!answer.isCorrect && q.type !== "matching" && (
                    <p className="exam-feedback__answer">
                      Respuesta correcta:{" "}
                      <strong>{q.options.find((o) => o.id === q.correctOptionId)?.text}</strong>
                    </p>
                  )}
                  {!answer.isCorrect && q.type === "matching" && (
                    <ul className="exam-feedback__pairs">
                      {(q.pairs ?? []).map((p) => (
                        <li key={p.left}><strong>{p.left}</strong> → {p.right}</li>
                      ))}
                    </ul>
                  )}
                  <p className="exam-feedback__explanation">{q.explanation}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {attemptDone && (
        <div className="exam-done">
          <p>
            {EXAM_CONFIG.maxAttempts === 1 ? "Examen terminado" : `Intento ${attemptNumber} terminado`}:{" "}
            <strong>{getCurrentAttemptScore(lesson.week, total)}%</strong>. Quedó registrado con tu usuario, la lección, la fecha, tus
            respuestas, las respuestas correctas y tu puntuación.
          </p>
          {canRetry ? (
            <button
              type="button"
              className="exam-match__confirm"
              onClick={() => {
                startAttempt(lesson.week);
                setDraft({});
                setNotice("");
                setTick((t) => t + 1);
              }}
            >
              Iniciar intento {used + 1} de {EXAM_CONFIG.maxAttempts}
            </button>
          ) : (
            <p>{EXAM_CONFIG.maxAttempts === 1 ? "Este examen tiene un único intento: su resultado ya no puede repetirse." : `Usaste los ${EXAM_CONFIG.maxAttempts} intentos disponibles.`}</p>
          )}
        </div>
      )}

      <div className="exam-footer">
        <Link to={`/plan-anual/semana-${lesson.week}`} className="exam-footer__link">
          ← Volver a la guía de la semana
        </Link>
        <Link to={`/plan-anual/semana-${lesson.week}/revision`} className="exam-footer__link">
          Ver historial de errores →
        </Link>
      </div>
    </div>
  );
}
