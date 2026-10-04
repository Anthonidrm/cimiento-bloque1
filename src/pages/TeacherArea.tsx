import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import PrepBar from "../components/PrepBar";
import { getAllWeeks, getModules } from "../services/weekService";
import { getPreparationPercent } from "../services/preparationService";
import "./Course.css";
import "./TeacherArea.css";

export default function TeacherArea() {
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
