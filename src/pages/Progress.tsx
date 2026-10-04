import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import { getAllWeeks } from "../services/weekService";
import { getPreparationPercent } from "../services/preparationService";
import "./Course.css";
import "./Progress.css";

interface WeekProgress {
  week: number;
  title: string;
  percent: number;
}

export default function Progress() {
  const [perWeek, setPerWeek] = useState<WeekProgress[]>([]);

  useEffect(() => {
    const weeks = getAllWeeks().filter((w) => w.status === "developed");
    setPerWeek(
      weeks.map((w) => ({
        week: w.week,
        title: w.title,
        percent: getPreparationPercent(w.week),
      }))
    );
  }, []);

  const overall = perWeek.length
    ? Math.round(perWeek.reduce((sum, w) => sum + w.percent, 0) / perWeek.length)
    : 0;
  const completedWeeks = perWeek.filter((w) => w.percent === 100).length;

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Mi progreso" }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">Progreso del Plan Anual</p>
        <h1>Mi progreso</h1>
        <p className="page-header__desc">
          Calculado automáticamente para cada semana desarrollada: examen del maestro (30%), uso de la
          presentación (20%) y preparación con la guía (el 50% restante, cuyo reparto final está
          pendiente de definir).
        </p>
      </header>

      <div className="progress-summary">
        <div
          className="progress-ring"
          style={{ "--p": overall } as React.CSSProperties}
        >
          <span className="progress-ring__value">{overall}%</span>
        </div>
        <p className="progress-summary__text">
          {completedWeeks} de {perWeek.length} semanas desarrolladas
          completadas al 100%
        </p>
      </div>

      <ul className="progress-list">
        {perWeek.map((w) => (
          <li key={w.week} className="progress-list__item">
            <Link to={`/plan-anual/semana-${w.week}`} className="progress-list__label">
              Semana {String(w.week).padStart(2, "0")} · {w.title}
            </Link>
            <div className="progress-list__bar">
              <div
                className="progress-list__bar-fill"
                style={{ width: `${w.percent}%` }}
              />
            </div>
            <span className="progress-list__percent">
              {w.percent === 100 ? "✓" : `${w.percent}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
