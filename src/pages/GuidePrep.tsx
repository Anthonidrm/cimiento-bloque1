import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useWeekParam } from "../utils/weekParam";
import Breadcrumbs from "../components/Breadcrumbs";
import PrepBar from "../components/PrepBar";
import GuideBlocks from "../components/GuideBlocks";
import { queueGuideSeconds } from "../backend/sync";
import PreparationPanel from "../components/PreparationPanel";
import PrintableWeekGuide from "../components/PrintableWeekGuide";
import { ChildBoy, ChildGirl } from "../components/characters";
import { useAuth } from "../auth/AuthContext";
import { buildGuideSections, GUIDE_SECTION_COUNT } from "../data/guideSections";
import { getWeekByNumber } from "../services/weekService";
import {
  MIN_SECONDS_PER_SECTION,
  activeSection,
  addSeconds,
  allCompleted,
  appendVisit,
  completedCount,
  guidePercent,
  isOpened,
  isUnlocked,
  loadProgress,
  openSection,
  saveProgress,
  type GuideProgress,
} from "../services/guidePrepService";
import "./Course.css";
import "./WeekHeader.css";
import "./GuidePrep.css";

interface Visit {
  section: number;
  enteredAt: string;
  seconds: number;
}

export default function GuidePrep() {
  const week = useWeekParam();
  const lesson = getWeekByNumber(week);
  const { session } = useAuth();
  const userId = session?.userId ?? "anon";

  const [progress, setProgress] = useState<GuideProgress>(() => loadProgress(week, userId));
  const [prepKey, setPrepKey] = useState(0);
  const progressRef = useRef(progress);
  const visitRef = useRef<Visit | null>(null);

  const sections = useMemo(() => (lesson ? buildGuideSections(lesson) : []), [lesson]);

  // Recargar el progreso guardado cuando cambia la lección o el usuario.
  useEffect(() => {
    const p = loadProgress(week, userId);
    progressRef.current = p;
    setProgress(p);
    visitRef.current = null;
  }, [week, userId]);

  // Cronómetro: cuenta segundos del apartado abierto que aún no se completa,
  // solo mientras la pestaña está visible. Guarda en cada segundo.
  useEffect(() => {
    function commit(next: GuideProgress) {
      progressRef.current = next;
      saveProgress(next);
      setProgress(next);
    }
    function flushVisit(completed: boolean) {
      const v = visitRef.current;
      visitRef.current = null;
      if (!v || v.seconds <= 0) return;
      const now = new Date();
      commit(
        appendVisit(progressRef.current, {
          userId,
          week,
          section: v.section,
          date: now.toISOString().slice(0, 10),
          enteredAt: v.enteredAt,
          leftAt: now.toISOString(),
          seconds: v.seconds,
          completed,
        })
      );
    }
    function tick() {
      if (document.visibilityState !== "visible") {
        flushVisit(false);
        return;
      }
      const p = progressRef.current;
      const n = activeSection(p);
      if (n == null) {
        flushVisit(false);
        return;
      }
      const nowISO = new Date().toISOString();
      if (!visitRef.current || visitRef.current.section !== n) {
        flushVisit(false);
        visitRef.current = { section: n, enteredAt: nowISO, seconds: 0 };
      }
      visitRef.current.seconds += 1;
      const next = addSeconds(progressRef.current, n, 1, nowISO);
      commit(next);
      queueGuideSeconds(next.week, n, 1);
      if (next.sections[n]?.completed) {
        flushVisit(true);
        setPrepKey((k) => k + 1);
      }
    }
    const id = window.setInterval(tick, 1000);
    const onHide = () => {
      if (document.visibilityState !== "visible") flushVisit(false);
    };
    document.addEventListener("visibilitychange", onHide);
    const onPageHide = () => flushVisit(false);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      flushVisit(false);
    };
  }, [userId, week]);

  if (!lesson || lesson.status === "pending") return <Navigate to="/plan-anual" replace />;

  function handleOpen(n: number) {
    const next = openSection(progressRef.current, n, new Date().toISOString());
    progressRef.current = next;
    saveProgress(next);
    setProgress(next);
  }

  const done = completedCount(progress);
  const finished = allCompleted(progress);
  const pdfHref = `/guias/guia-semana-${lesson.week}.pdf`;

  const resources: { label: string; href: string }[] = [];
  const tp = lesson.teacherPresentation;
  if (tp.fileUrl) resources.push({ label: "Presentación (PDF)", href: tp.fileUrl });
  if (tp.secondaryUrl) resources.push({ label: "Presentación (PowerPoint)", href: tp.secondaryUrl });
  if (lesson.studentWorksheet.fileUrl) resources.push({ label: "Hoja de trabajo", href: lesson.studentWorksheet.fileUrl });
  if (lesson.coloringSheet.fileUrl) resources.push({ label: "Hoja para colorear", href: lesson.coloringSheet.fileUrl });
  if (lesson.verseCard.fileUrl) resources.push({ label: "Versículo para llevar a casa", href: lesson.verseCard.fileUrl });

  return (
    <div className="container page">
      <div className="no-print">
        <Breadcrumbs
          items={[
            { label: "Inicio", to: "/" },
            { label: "Plan Anual", to: "/plan-anual" },
            { label: `Semana ${lesson.week}`, to: `/plan-anual/semana-${lesson.week}` },
            { label: "Guía del Maestro" },
          ]}
        />

        <header className="guide-head">
          <div>
            <p className="page-header__eyebrow">Semana {lesson.week} · Guía del Maestro</p>
            <h1>{lesson.title}</h1>
            <p className="guide-head__sub">
              Avanza apartado por apartado: cada uno se desbloquea cuando permaneces al menos{" "}
              {MIN_SECONDS_PER_SECTION} segundos en el anterior. Tu progreso se guarda y puedes
              retomarlo cuando vuelvas.
            </p>
          </div>
          <div className="guide-head__chars" aria-hidden="true">
            <ChildGirl size={130} pose="wave" />
            <ChildBoy size={130} pose="cheer" />
          </div>
        </header>

        <div className="guide-toolbar">
          <button type="button" className="guide-btn" onClick={() => window.print()}>
            🖨 Imprimir guía
          </button>
          <a className="guide-btn guide-btn--ghost" href={pdfHref} download>
            ⬇ Descargar PDF
          </a>
        </div>

        <div className="guide-progress">
          <PrepBar percent={guidePercent(progress)} label={`${done} de ${GUIDE_SECTION_COUNT} apartados`} />
        </div>

        {finished && (
          <div className="guide-done" role="status">
            <div>
              <strong>Preparación completada</strong>
              <span>Completaste los {GUIDE_SECTION_COUNT} apartados de la guía de esta lección.</span>
            </div>
            <button type="button" className="guide-btn" onClick={() => window.print()}>
              Imprimir lección
            </button>
          </div>
        )}

        <ol className="guide-steps">
          {sections.map((s) => {
            const st = progress.sections[s.number];
            const unlocked = isUnlocked(progress, s.number);
            const opened = isOpened(progress, s.number);
            const completed = !!st?.completed;
            const state = completed ? "done" : opened ? "progress" : unlocked ? "available" : "locked";
            const secs = Math.min(st?.seconds ?? 0, MIN_SECONDS_PER_SECTION);
            return (
              <li key={s.key} className={`guide-step is-${state}`} id={s.key}>
                <div className="guide-step__head">
                  <span className="guide-step__num">{String(s.number).padStart(2, "0")}</span>
                  <h2 className="guide-step__title">{s.title}</h2>
                  <span className="guide-step__status">
                    {state === "locked" && <span title="Bloqueado">🔒 Bloqueado</span>}
                    {state === "available" && (
                      <button type="button" className="guide-open" onClick={() => handleOpen(s.number)}>
                        Abrir apartado
                      </button>
                    )}
                    {state === "progress" && (
                      <span className="guide-timer">
                        ⏱ {secs}/{MIN_SECONDS_PER_SECTION} s
                      </span>
                    )}
                    {state === "done" && <span className="guide-ok">✓ Completado</span>}
                  </span>
                </div>
                {state === "progress" && (
                  <div className="guide-step__bar" aria-hidden="true">
                    <div style={{ width: `${(secs / MIN_SECONDS_PER_SECTION) * 100}%` }} />
                  </div>
                )}
                {opened && (
                  <div className="guide-step__body">
                    <GuideBlocks blocks={s.blocks}  />
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <section className="guide-side">
          <h2>Recursos de esta lección</h2>
          <div className="guide-links">
            {resources.map((r) => (
              <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer">
                {r.label} ↗
              </a>
            ))}
            {lesson.externalResources.map((r) => (
              <a key={r.url + r.label} href={r.url} target="_blank" rel="noopener noreferrer">
                {r.label} ↗
              </a>
            ))}
          </div>
        </section>

        <section className="guide-side">
          <h2>Tu preparación para esta lección</h2>
          <PreparationPanel week={lesson.week} refreshKey={prepKey} />
          <p className="guide-side__cta">
            <Link to={`/plan-anual/semana-${lesson.week}/examen`} className="guide-btn">
              Examen del maestro (25%)
            </Link>
            <Link to={`/plan-anual/semana-${lesson.week}`} className="guide-back">
              ← Volver a la semana
            </Link>
          </p>
        </section>
      </div>

      <PrintableWeekGuide week={lesson} />
    </div>
  );
}
