import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useWeekParam } from "../utils/weekParam";
import Breadcrumbs from "../components/Breadcrumbs";
import { getWeekByNumber } from "../services/weekService";
import {
  answerQuestion,
  getLatestAttempt,
  getAttemptCount,
  getExamScore,
  isExamComplete,
  type AttemptRecord,
} from "../services/examService";
import "./Course.css";
import "./WeekExam.css";

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Selección múltiple",
  true_false: "Verdadero / Falso",
  comprehension: "Comprensión",
  scenario: "Situación práctica",
  pedagogical: "Aplicación pedagógica",
  doctrinal: "Doctrina",
};

export default function WeekExam() {
  const week = useWeekParam();
  const lesson = getWeekByNumber(week);

  const [tick, setTick] = useState(0); // fuerza re-render tras responder

  useEffect(() => {
    setTick((t) => t + 1);
  }, [lesson]);

  if (!lesson) return <Navigate to="/plan-anual" replace />;
  if (lesson.status === "pending" || lesson.examQuestions.length === 0) {
    return <Navigate to="/plan-anual" replace />;
  }

  function select(questionId: string, optionId: string, correctOptionId: string) {
    answerQuestion(lesson!.week, questionId, optionId, correctOptionId);
    setTick((t) => t + 1);
  }

  const total = lesson.examQuestions.length;
  const complete = isExamComplete(lesson.week, total);
  const score = getExamScore(lesson.week, total);

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
          Responde cada pregunta. Verás de inmediato si acertaste, con la
          explicación bíblica o pedagógica correspondiente. Puedes cambiar
          tu respuesta las veces que necesites — cada intento queda
          registrado en tu historial, incluidos los errores anteriores.
        </p>
        {complete && (
          <p className="exam-score-banner">
            Resultado actual: <strong>{score}%</strong> ({total} de {total}{" "}
            preguntas respondidas)
          </p>
        )}
      </header>

      <ol className="exam-question-list" key={tick}>
        {lesson.examQuestions.map((q, i) => {
          const answer: AttemptRecord | undefined = getLatestAttempt(lesson.week, q.id);
          const attemptCount = getAttemptCount(lesson.week, q.id);
          return (
            <li key={q.id} className="exam-question">
              <div className="exam-question__head">
                <span className="exam-question__num">{i + 1}</span>
                <span className="exam-question__type">{TYPE_LABELS[q.type] ?? q.type}</span>
              </div>
              <p className="exam-question__prompt">{q.prompt}</p>

              <div className="exam-question__options">
                {q.options.map((opt) => {
                  const isSelected = answer?.selectedOptionId === opt.id;
                  const showState = answer && isSelected;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`exam-option ${isSelected ? "is-selected" : ""} ${
                        showState ? (answer!.isCorrect ? "is-correct" : "is-incorrect") : ""
                      }`}
                      onClick={() => select(q.id, opt.id, q.correctOptionId)}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              {answer && (
                <div
                  className={`exam-feedback ${answer.isCorrect ? "is-correct" : "is-incorrect"}`}
                >
                  <p className="exam-feedback__verdict">
                    {answer.isCorrect ? "✓ Correcto" : "✗ Incorrecto"}
                  </p>
                  {!answer.isCorrect && (
                    <p className="exam-feedback__answer">
                      Respuesta correcta:{" "}
                      <strong>
                        {q.options.find((o) => o.id === q.correctOptionId)?.text}
                      </strong>
                    </p>
                  )}
                  <p className="exam-feedback__explanation">{q.explanation}</p>
                  <p className="exam-feedback__attempts">
                    Intentos en esta pregunta: {attemptCount}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="exam-footer">
        <Link to={`/plan-anual/semana-${lesson.week}`} className="exam-footer__link">
          ← Volver a la guía de la semana
        </Link>
        <Link
          to={`/plan-anual/semana-${lesson.week}/revision`}
          className="exam-footer__link"
        >
          Ver historial de errores →
        </Link>
      </div>
    </div>
  );
}
