import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useWeekParam } from "../utils/weekParam";
import Breadcrumbs from "../components/Breadcrumbs";
import PreparationPanel from "../components/PreparationPanel";
import { ChildBoy, ChildGirl } from "../components/characters";
import { useAuth } from "../auth/AuthContext";
import { STAFF_ROLES } from "../auth/types";
import { getAdjacentWeeks, getWeekByNumber } from "../services/weekService";
import { isExamComplete, getExamScore } from "../services/examService";
import { ResourcesList } from "../components/panels/ResourcesPanel";
import "./Course.css";
import "./WeekHeader.css";
import "./WeekDetail.css";
import "../components/LessonPager.css";

export default function WeekDetail() {
  const week = useWeekParam();
  const lesson = getWeekByNumber(week);
  const { session, backend } = useAuth();
  const isStaff = !!session && STAFF_ROLES.includes(session.role);

  const [examDone, setExamDone] = useState(false);
  const [examScore, setExamScore] = useState(0);

  useEffect(() => {
    if (!lesson || !session) return;
    const total = lesson.examQuestions.length;
    setExamDone(isExamComplete(lesson.week, total));
    setExamScore(getExamScore(lesson.week, total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, session]);

  if (!lesson) return <Navigate to="/plan-anual" replace />;
  if (lesson.status === "pending") return <Navigate to="/plan-anual" replace />;

  const { prev, next } = getAdjacentWeeks(lesson.week);

  const resourceRows: {
    key: string;
    label: string;
    resource: { title: string; status: "pending" | "available"; fileUrl?: string; secondaryUrl?: string; secondaryLabel?: string };
    onOpen?: () => void;
  }[] = [
    {
      key: "worksheet",
      label: "📝 Hoja de trabajo del estudiante (5–10 años)",
      resource: lesson.studentWorksheet,
    },
    {
      key: "coloring",
      label: "🎨 Hoja para colorear (3–5 años)",
      resource: lesson.coloringSheet,
    },
    {
      key: "verse",
      label: "📖 Versículo para llevar a casa (RVR1960)",
      resource: lesson.verseCard,
    },
  ];

  return (
    <div className="container page">
      <Breadcrumbs
        items={[
          { label: "Inicio", to: "/" },
          { label: "Plan Anual", to: "/plan-anual" },
          { label: `Semana ${lesson.week}` },
        ]}
      />

      <header className="lesson-header">
        <div className="lesson-header__top">
          <span className="lesson-header__week">Semana {lesson.week}</span>
        </div>
        <h1>{lesson.title}</h1>
        <div className="lesson-header__chars" aria-hidden="true">
          <ChildGirl size={120} pose="wave" />
          <ChildBoy size={120} pose="cheer" />
        </div>
        <div className="lesson-header__facts">
          <div className="lesson-header__fact">
            <span className="lesson-header__fact-label">Verdad central</span>
            <p>{lesson.centralTruth}</p>
          </div>
          <div className="lesson-header__fact">
            <span className="lesson-header__fact-label">Versículo(s) principal(es)</span>
            <p className="lesson-header__texts">{lesson.mainVerses}</p>
            <p className="lesson-header__texts-ref">{lesson.fullBibleTextRef}</p>
          </div>
          <div className="lesson-header__fact">
            <span className="lesson-header__fact-label">Objetivo</span>
            <p>{lesson.objective}</p>
          </div>
        </div>
      </header>

      {/* Acceso destacado: Guía del Maestro */}
      <Link to={`/plan-anual/semana-${lesson.week}/guia`} className="guide-cta">
        <span className="guide-cta__icon">📖</span>
        <span className="guide-cta__text">
          <strong>Guía del Maestro</strong>
          <span>Estudia la lección paso a paso (23 apartados), con registro de tu preparación, e imprímela</span>
        </span>
        <span className="guide-cta__arrow">→</span>
      </Link>

      <div className="lesson-body">
        <section className="week-section">
          <h2>Base doctrinal</h2>
          <dl className="doctrinal-list">
            <dt>Qué afirma el texto</dt>
            <dd>{lesson.doctrinalBase.textAffirms}</dd>
            <dt>Qué se deriva legítimamente</dt>
            <dd>{lesson.doctrinalBase.legitimateDerivation}</dd>
            <dt>Aplicación para los niños</dt>
            <dd>{lesson.doctrinalBase.applicationForChildren}</dd>
            <dt>Qué NO enseñar</dt>
            <dd>{lesson.doctrinalBase.doNotTeach}</dd>
            <dt>Errores doctrinales a evitar</dt>
            <dd>{lesson.doctrinalBase.commonErrorsToAvoid}</dd>
          </dl>
        </section>

        <section className="week-section">
          <h2>Guía del maestro (resumen)</h2>
          <p><strong>Introducción:</strong> {lesson.introduction}</p>
          <p><strong>Desarrollo:</strong> {lesson.developmentOutline}</p>
          <p><strong>Explicación bíblica:</strong> {lesson.biblicalExplanation}</p>
          <p><strong>Preguntas para los niños:</strong></p>
          <ul>{lesson.questionsForChildren.map((q) => <li key={q}>{q}</li>)}</ul>

          <div>
            <p><strong>Actividad:</strong> {lesson.activity}</p>
            <p><strong>Dinámica:</strong> {lesson.dynamic}</p>
          </div>

          <p><strong>Aplicación práctica:</strong> {lesson.practicalApplication}</p>
          <p><strong>Oración sugerida:</strong> "{lesson.suggestedPrayer}"</p>

          <p><strong>Materiales:</strong> {lesson.materials.join(", ")}</p>

          <p><strong>Preparación previa:</strong></p>
          <ul>{lesson.priorPreparation.map((p) => <li key={p}>{p}</li>)}</ul>
          <p><strong>Errores que el maestro debe evitar:</strong></p>
          <ul>{lesson.teacherErrorsToAvoid.map((e) => <li key={e}>{e}</li>)}</ul>
          <p><strong>Adaptación 3–4 años:</strong> {lesson.adaptationYounger}</p>
          <p><strong>Adaptación 8–10 años:</strong> {lesson.adaptationOlder}</p>
          <p><strong>Cierre:</strong> {lesson.closing}</p>
          <p className="week-section__more">
            <Link to={`/plan-anual/semana-${lesson.week}/guia`}>
              Ver la guía completa del maestro →
            </Link>
          </p>
        </section>

        <section className="week-section">
          <h2>Recursos de la semana (4)</h2>

          {backend ? (
            <>
              {isStaff && (
                <p>
                  <Link to={`/plan-anual/semana-${lesson.week}/presentacion`}>Proyectar la presentación en la aplicación (cuenta para tu preparación) →</Link>
                </p>
              )}
              <ResourcesList week={lesson.week} />
            </>
          ) : (
            <>
          <div className="resource-row resource-row--featured">
            <div>
              <span className="resource-row__label">🖥️ Presentación para proyectar a los niños</span>
              <p className="resource-row__desc">
                {lesson.teacherPresentation.title} — el maestro la proyecta en
                clase; las instrucciones para usarla están en la Guía del
                Maestro (apartado 20), no dentro de las diapositivas.
              </p>
            </div>
            {lesson.teacherPresentation.status === "available" ? (
              <div className="resource-row__actions">
                {isStaff && (
                  <Link to={`/plan-anual/semana-${lesson.week}/presentacion`}>
                    Proyectar en la aplicación (cuenta para tu preparación)
                  </Link>
                )}
                <a
                  href={lesson.teacherPresentation.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir (PDF) ↗
                </a>
                {lesson.teacherPresentation.secondaryUrl && (
                  <a
                    href={lesson.teacherPresentation.secondaryUrl}
                    >
                    {lesson.teacherPresentation.secondaryLabel ?? "Descargar"}
                  </a>
                )}
              </div>
            ) : (
              <span className="empty-note">pendiente de generar</span>
            )}
          </div>

          {resourceRows.map((row) => (
            <div className="resource-row" key={row.key}>
              <div>
                <span className="resource-row__label">{row.label}</span>
              </div>
              {row.resource.status === "available" ? (
                <div className="resource-row__actions">
                  <a href={row.resource.fileUrl} target="_blank" rel="noopener noreferrer">
                    Abrir ↗
                  </a>
                </div>
              ) : (
                <span className="empty-note">pendiente de generar</span>
              )}
            </div>
          ))}

            </>
          )}

          {lesson.verseRVR1960.text && (
            <blockquote className="verse-preview">
              “{lesson.verseRVR1960.text}”
              <span>— {lesson.verseRVR1960.ref} (RVR1960)</span>
            </blockquote>
          )}
        </section>

        {lesson.externalResources.length > 0 && (
          <section className="week-section">
            <h2>Recursos adicionales relacionados con el tema</h2>
            {lesson.externalResources.map((r) => (
              <div className="external-resource" key={r.label}>
                <span className="external-resource__label">{r.label}</span>
                <p className="external-resource__name">{r.name}</p>
                <p className="external-resource__desc">{r.description}</p>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  Abrir ↗
                </a>
              </div>
            ))}
          </section>
        )}

        <section className="week-section">
          <h2>Preparación del maestro</h2>
          <PreparationPanel week={lesson.week} />

          {isStaff && (
            <div className="week-exam-cta">
              <Link to={`/plan-anual/semana-${lesson.week}/examen`} className="week-exam-btn">
                {examDone
                  ? `Examen completado — ${examScore}% · Repetir examen`
                  : "Realizar examen del maestro (30%)"}
              </Link>
              <Link
                to={`/plan-anual/semana-${lesson.week}/revision`}
                className="week-exam-review-link"
              >
                Ver historial de errores
              </Link>
            </div>
          )}
        </section>
      </div>

      <nav className="lesson-pager" aria-label="Navegación entre semanas">
        {prev ? (
          <Link to={`/plan-anual/semana-${prev.week}`} className="lesson-pager__link">
            <span className="lesson-pager__dir">← Semana anterior</span>
            <span className="lesson-pager__label">
              Semana {prev.week}
              {prev.status === "developed" ? ` · ${prev.title}` : ""}
            </span>
          </Link>
        ) : (
          <span className="lesson-pager__spacer" />
        )}
        <Link to="/plan-anual" className="lesson-pager__back">
          Volver al plan anual
        </Link>
        {next ? (
          <Link
            to={`/plan-anual/semana-${next.week}`}
            className="lesson-pager__link lesson-pager__link--next"
          >
            <span className="lesson-pager__dir">Semana siguiente →</span>
            <span className="lesson-pager__label">
              Semana {next.week}
              {next.status === "developed" ? ` · ${next.title}` : ""}
            </span>
          </Link>
        ) : (
          <span className="lesson-pager__spacer" />
        )}
      </nav>
    </div>
  );
}
