import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import PrepBar from "../components/PrepBar";
import { getAllWeeks, getModules } from "../services/weekService";
import { getPreparationPercent } from "../services/preparationService";
import "../pages/Course.css";
import "./AnnualPlan.css";

export default function AnnualPlan() {
  const weeks = getAllWeeks();
  const modules = getModules();
  const [percents, setPercents] = useState<Record<number, number>>({});

  useEffect(() => {
    const map: Record<number, number> = {};
    weeks.forEach((w) => {
      if (w.status === "developed") map[w.week] = getPreparationPercent(w.week);
    });
    setPercents(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalDeveloped = weeks.filter((w) => w.status === "developed").length;

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Plan Anual" }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">52 semanas · 12 módulos</p>
        <h1>Plan Anual</h1>
        <p className="page-header__desc">
          Estructura única y definitiva de CIMIENTO: 52 semanas organizadas
          en 12 módulos doctrinales. {totalDeveloped} de 52 semanas están
          completas hasta ahora (Módulo 1). El resto del plan se irá
          desarrollando módulo por módulo.
        </p>
      </header>

      {modules.map((mod) => {
        const modWeeks = weeks.filter((w) => w.module === mod.id && w.status === "developed");
        const totalInModule = mod.weekEnd - mod.weekStart + 1;

        return (
          <section key={mod.id} className="annual-module">
            <h2 className="annual-module__title">
              Módulo {mod.id} — {mod.title}
              <span className="annual-module__range">
                Semanas {mod.weekStart}–{mod.weekEnd}
              </span>
            </h2>

            {modWeeks.length > 0 ? (
              <ul className="annual-week-list">
                {modWeeks.map((w) => (
                  <li key={w.week} className="annual-week-item">
                    <Link to={`/plan-anual/semana-${w.week}`} className="annual-week-item__link">
                      <span className="annual-week-item__num">
                        S{String(w.week).padStart(2, "0")}
                      </span>
                      <span className="annual-week-item__title">{w.title}</span>
                    </Link>
                    <div className="annual-week-item__prep">
                      <PrepBar percent={percents[w.week] ?? 0} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="annual-module__notdev">
                {totalInModule} semanas — este módulo todavía no ha sido
                desarrollado.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
