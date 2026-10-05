import { Navigate, Link } from "react-router-dom";
import { useWeekParam } from "../utils/weekParam";
import Breadcrumbs from "../components/Breadcrumbs";
import { getWeekByNumber } from "../services/weekService";
import { getQuestionSummaries } from "../services/examService";
import "./Course.css";
import "./WeekExam.css";
import "./ExamReview.css";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-DO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ExamReview() {
  const week = useWeekParam();
  const lesson = getWeekByNumber(week);

  if (!lesson) return <Navigate to="/plan-anual" replace />;
  if (lesson.status === "pending") return <Navigate to="/plan-anual" replace />;

  const summaries = getQuestionSummaries(lesson.week).filter(
    (s) => s.missedAttempts.length > 0
  );

  return (
    <div className="container page">
      <Breadcrumbs
        items={[
          { label: "Inicio", to: "/" },
          { label: "Plan Anual", to: "/plan-anual" },
          { label: `Semana ${lesson.week}`, to: `/plan-anual/semana-${lesson.week}` },
          { label: "Historial de errores" },
        ]}
      />

      <header className="page-header">
        <p className="page-header__eyebrow">Semana {lesson.week} · {lesson.title}</p>
        <h1>Historial de errores</h1>
        <p className="page-header__desc">
          Cada error que has cometido en esta semana queda registrado aquí,
          con el intento del examen, la fecha, tu respuesta, la respuesta
          correcta y la explicación. Las respuestas registradas no se modifican.
        </p>
      </header>

      {summaries.length === 0 ? (
        <p className="exam-review-empty">
          Todavía no tienes errores registrados en esta semana (o aún no
          has respondido ninguna pregunta).
        </p>
      ) : (
        <ol className="exam-question-list">
          {summaries.map((s) => {
            const q = lesson.examQuestions.find((qq) => qq.id === s.questionId);
            if (!q) return null;
            return (
              <li key={s.questionId} className="exam-question">
                <div className="exam-question__head">
                  <span
                    className={`exam-review__status ${
                      s.currentlyCorrect ? "is-resolved" : "is-open"
                    }`}
                  >
                    {s.currentlyCorrect ? "Corregida en un intento posterior" : "Sigue incorrecta"}
                  </span>
                  <span className="exam-review__total-attempts">
                    {s.totalAttempts} intento{s.totalAttempts !== 1 ? "s" : ""} del examen
                  </span>
                </div>
                <p className="exam-question__prompt">{q.prompt}</p>

                <div className="exam-review__attempts">
                  {s.missedAttempts.map((a, idx) => {
                    const selected = q.options.find((o) => o.id === a.selectedOptionId);
                    const correct = q.options.find((o) => o.id === q.correctOptionId);
                    return (
                      <div key={idx} className="exam-review__attempt-card">
                        <p className="exam-review__attempt-meta">
                          Intento #{a.attemptNumber} del examen · {formatDate(a.answeredAt)}
                        </p>
                        {q.type === "matching" ? (
                          <>
                            {(q.pairs ?? []).map((p) => (
                              <p key={p.left} className="exam-review__row">
                                {p.left} →{" "}
                                <span className={a.pairs?.[p.left] === p.right ? "exam-review__right" : "exam-review__wrong"}>
                                  {a.pairs?.[p.left] ?? "—"}
                                </span>
                                {a.pairs?.[p.left] !== p.right && (
                                  <> (correcto: <span className="exam-review__right">{p.right}</span>)</>
                                )}
                              </p>
                            ))}
                          </>
                        ) : (
                          <>
                            <p className="exam-review__row">
                              Tu respuesta: <span className="exam-review__wrong">{selected?.text}</span>
                            </p>
                            <p className="exam-review__row">
                              Respuesta correcta:{" "}
                              <span className="exam-review__right">{correct?.text}</span>
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="exam-feedback__explanation">{q.explanation}</p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="exam-footer">
        <Link to={`/plan-anual/semana-${lesson.week}/examen`} className="exam-footer__link">
          ← Volver al examen
        </Link>
        <Link to={`/plan-anual/semana-${lesson.week}`} className="exam-footer__link">
          Volver a la guía de la semana
        </Link>
      </div>
    </div>
  );
}
