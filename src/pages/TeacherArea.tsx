import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import PrepBar from "../components/PrepBar";
import { getAllWeeks, getModules } from "../services/weekService";
import { getPreparationPercent } from "../services/preparationService";
import { useAuth } from "../auth/AuthContext";
import { listLessons } from "../backend/teaching";
import { Loading } from "../components/panels/ui";
import { useAsync } from "../components/panels/hooks";
import { TeacherProgressTable, StudentProgressTable } from "../components/panels/ProgressTables";
import { NotificationsPanel } from "../components/panels/ExtrasPanels";
import "./Course.css";
import "./TeacherArea.css";

/** Con backend: mis lecciones asignadas, con acceso al aula; el Administrador y el Pastor ven todas. */
function MyLessons() {
  const { session } = useAuth();
  const q = useAsync(listLessons, []);
  if (q.loading || q.error) return <Loading state={q} />;
  const staff = session?.role !== "MAESTRO";
  const rows = (q.data ?? []).filter((l) => l.teacher_id && (staff || l.teacher_id === session?.userId));
  return (
    <section className="pn-section">
      <h2>{staff ? "Lecciones con maestro asignado" : "Mis lecciones asignadas"}</h2>
      {rows.length === 0 ? <p>{staff ? "Todavía no hay lecciones asignadas." : "Todavía no tienes lecciones asignadas. El Pastor o el Administrador las asignan."}</p> : (
        <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Semana</th><th>Lección</th><th>Maestro</th><th /></tr></thead><tbody>
          {rows.map((l) => <tr key={l.week}><td>{l.week}</td><td>{l.title ?? "Tema pendiente"}</td><td>{l.teacher_name}</td><td><Link className="pn-btn" style={{ textDecoration: "none" }} to={`/plan-anual/semana-${l.week}/aula`}>Abrir aula</Link></td></tr>)}
        </tbody></table></div>
      )}
    </section>
  );
}

export default function TeacherArea() {
  const { backend, session } = useAuth();
  const weeks = getAllWeeks().filter((w) => w.status === "developed");
  const modules = getModules();
  const [percents, setPercents] = useState<Record<number, number>>({});

  useEffect(() => {
    const map: Record<number, number> = {};
    weeks.forEach((w) => {
      map[w.week] = getPreparationPercent(w.week);
    });
    setPercents(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Área del maestro" }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">Preparación de clases · Plan Anual</p>
        <h1>Área del maestro</h1>
        <p className="page-header__desc">
          El porcentaje de preparación de cada semana desarrollada del Plan Anual. Entra a una semana
          para estudiar su guía paso a paso, hacer el examen del maestro y abrir la presentación — tu
          progreso se guarda en este navegador.
        </p>
      </header>

      {backend && (
        <>
          <MyLessons />
          <TeacherProgressTable title={session?.role === "MAESTRO" ? "Mi progreso" : "Progreso de maestros"} />
          <StudentProgressTable title={session?.role === "MAESTRO" ? "Progreso de mis estudiantes" : "Progreso de estudiantes"} />
          <NotificationsPanel />
        </>
      )}

      {modules.map((mod) => {
        const modWeeks = weeks.filter((w) => w.module === mod.id);
        if (modWeeks.length === 0) return null;
        return (
          <section key={mod.id} className="teacher-module">
            <h2 className="teacher-module__title">
              Módulo {mod.id} — {mod.title}
            </h2>
            <ul className="teacher-list">
              {modWeeks.map((w) => {
                const percent = percents[w.week] ?? 0;
                return (
                  <li className="teacher-list__item" key={w.week}>
                    <Link to={`/plan-anual/semana-${w.week}`} className="teacher-list__row">
                      <span className="teacher-list__week">
                        Semana {String(w.week).padStart(2, "0")}
                      </span>
                      <span className="teacher-list__title">{w.title}</span>
                      <div className="teacher-list__progress">
                        <PrepBar percent={percent} />
                      </div>
                      <span className="teacher-list__arrow" aria-hidden="true">→</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
