import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PrepBar from "./PrepBar";
import { useAuth } from "../auth/AuthContext";
import { STAFF_ROLES } from "../auth/types";
import { computePreparation, type PreparationResult } from "../services/preparationService";
import "./PreparationPanel.css";

/** Muestra el porcentaje de preparación y qué componentes están completos o faltan. */
export default function PreparationPanel({ week, refreshKey = 0 }: { week: number; refreshKey?: number }) {
  const { session } = useAuth();
  const [result, setResult] = useState<PreparationResult | null>(null);

  useEffect(() => {
    if (session) setResult(computePreparation(week, session.userId));
  }, [week, session, refreshKey]);

  if (!session || !STAFF_ROLES.includes(session.role)) {
    return (
      <div className="prep-panel">
        <p>
          Para registrar tu preparación de esta lección necesitas{" "}
          <Link to={`/login?next=${encodeURIComponent(`/plan-anual/semana-${week}`)}`}>iniciar sesión</Link>{" "}
          como maestro.
        </p>
      </div>
    );
  }
  if (!result) return null;

  return (
    <div className="prep-panel">
      <PrepBar percent={result.percent} label="Preparación" />
      <ul className="prep-panel__list">
        {result.components.map((c) => (
          <li key={c.key} className={c.done ? "is-done" : ""}>
            <span className="prep-panel__mark" aria-hidden="true">{c.done ? "✓" : "○"}</span>
            <span className="prep-panel__label">
              {c.label}
              <small>{c.detail}</small>
            </span>
            <span className="prep-panel__pts">
              {Math.round(c.earned)} / {Math.round(c.weight)}%
            </span>
          </li>
        ))}
      </ul>
      {result.remainingIsProvisional && (
        <p className="prep-panel__note">
          El reparto del 50 % restante (preparación y actividades obligatorias) todavía no está
          definido; por ahora lo recibe provisionalmente la preparación con la guía. El examen vale
          30 % y la presentación 20 %.
        </p>
      )}
    </div>
  );
}
