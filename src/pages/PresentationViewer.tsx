import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { queuePresentationSeconds } from "../backend/sync";
import { isBackendConfigured } from "../backend/config";
import { listResources } from "../backend/resources";
import { signedUrl } from "../backend/students";
import Breadcrumbs from "../components/Breadcrumbs";
import { useWeekParam } from "../utils/weekParam";
import { getWeekByNumber } from "../services/weekService";
import { PRESENTATION_CONFIG, slideUrl } from "../config/presentationConfig";
import { addSlideSeconds, addVisit, loadUsage, summarize } from "../services/presentationService";
import "./Course.css";
import "./PresentationViewer.css";

/**
 * Visor de la presentación: proyecta las diapositivas y registra el uso REAL
 * (segundos por diapositiva con la pestaña visible) que alimenta el 20 % de la preparación.
 */
export default function PresentationViewer() {
  const week = useWeekParam();
  const [params] = useSearchParams();
  const classSession = params.get("sesion") ?? undefined; // clase en curso (viene del aula)
  const lesson = getWeekByNumber(week);
  const total = PRESENTATION_CONFIG.slideCount;
  const [slide, setSlide] = useState(1);
  const [usage, setUsage] = useState(() => loadUsage(week));
  const stage = useRef<HTMLDivElement>(null);
  // Con backend, las diapositivas salen del bucket PRIVADO (URL firmadas). Si alguna no se ha migrado todavía, se usa la copia
  // de public/ (transitorio: el README indica borrar public/ tras validar la migración).
  const [signed, setSigned] = useState<Record<number, string>>({});
  useEffect(() => {
    if (!isBackendConfigured()) return;
    let live = true;
    listResources(week)
      .then((rows) => Promise.all(rows.filter((r) => r.kind === "IMAGEN" && r.slot.startsWith("diapositiva-") && r.current).map(async (r) => [Number(r.slot.split("-")[1]), await signedUrl("recursos", r.current!.storage_path, 3600)] as const)))
      .then((pairs) => { if (live) setSigned(Object.fromEntries(pairs)); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [week]);
  const slideRef = useRef(1);
  const visit = useRef<{ slide: number; enteredAt: string; seconds: number } | null>(null);

  const flush = useCallback(() => {
    const v = visit.current;
    visit.current = null;
    if (v && v.seconds > 0) addVisit(week, { slide: v.slide, enteredAt: v.enteredAt, leftAt: new Date().toISOString(), seconds: v.seconds });
  }, [week]);

  const go = useCallback(
    (n: number) => {
      const next = Math.min(total, Math.max(1, n));
      if (next === slideRef.current) return;
      flush();
      slideRef.current = next;
      setSlide(next);
    },
    [flush, total]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        flush();
        return;
      }
      const s = slideRef.current;
      if (!visit.current || visit.current.slide !== s) {
        flush();
        visit.current = { slide: s, enteredAt: new Date().toISOString(), seconds: 0 };
      }
      visit.current.seconds += 1;
      setUsage(addSlideSeconds(week, s, 1));
      queuePresentationSeconds(week, s, 1, classSession);
    }, 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); go(slideRef.current + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(slideRef.current - 1); }
      if (e.key === "f" || e.key === "F") stage.current?.requestFullscreen?.();
    };
    const onHide = () => { if (document.visibilityState !== "visible") flush(); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [week, go, flush, classSession]);

  if (!lesson || lesson.status === "pending" || lesson.teacherPresentation.status !== "available") {
    return <Navigate to="/plan-anual" replace />;
  }

  const sum = summarize(usage);
  return (
    <div className="container page">
      <Breadcrumbs
        items={[
          { label: "Inicio", to: "/" },
          { label: "Plan Anual", to: "/plan-anual" },
          { label: `Semana ${lesson.week}`, to: `/plan-anual/semana-${lesson.week}` },
          { label: "Presentación" },
        ]}
      />
      <header className="page-header">
        <p className="page-header__eyebrow">Semana {lesson.week} · {lesson.title}</p>
        <h1>Presentación</h1>
        <p className="page-header__desc">
          Proyecta las diapositivas a los niños (flechas del teclado para avanzar, <kbd>F</kbd> para pantalla
          completa). Se registra el uso real de cada diapositiva: una diapositiva cuenta cuando permanece al
          menos {PRESENTATION_CONFIG.minSecondsPerSlide} segundos en pantalla.
        </p>
      </header>

      <div className="viewer" ref={stage}>
        <img
          className="viewer__slide"
          src={signed[slide] ?? slideUrl(lesson.week, slide)}
          alt={`Diapositiva ${slide} de ${total} — ${lesson.title}`}
        />
        <div className="viewer__controls">
          <button type="button" onClick={() => go(slide - 1)} disabled={slide === 1}>← Anterior</button>
          <span aria-live="polite">{slide} / {total}</span>
          <button type="button" onClick={() => go(slide + 1)} disabled={slide === total}>Siguiente →</button>
          <button type="button" className="viewer__full" onClick={() => stage.current?.requestFullscreen?.()}>⛶ Pantalla completa</button>
        </div>
      </div>

      <div className="viewer__usage">
        <div className="viewer__dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={(usage.seconds[i + 1] ?? 0) >= PRESENTATION_CONFIG.minSecondsPerSlide ? "is-used" : ""}>{i + 1}</span>
          ))}
        </div>
        <p>
          Uso registrado: <strong>{sum.slidesUsed} de {sum.total}</strong> diapositivas proyectadas ·{" "}
          {Math.round(sum.fraction * 20)} de 20 puntos de preparación.
        </p>
        <Link to={`/plan-anual/semana-${lesson.week}`} className="viewer__back">← Volver a la semana</Link>
      </div>
    </div>
  );
}
