import { Link } from "react-router-dom";
import "./AreaSections.css";

export type SectionStatus = "available" | "partial" | "backend";

export interface AreaSection {
  title: string;
  description: string;
  status: SectionStatus;
  /** Ruta de lo que ya funciona (si existe). */
  to?: string;
  /** Qué falta y por qué. */
  note?: string;
}

const LABEL: Record<SectionStatus, string> = {
  available: "Disponible",
  partial: "Parcial",
  backend: "Requiere backend",
};

/** Tarjetas de un panel con su estado real: lo que funciona hoy y lo que depende del backend. */
export default function AreaSections({ sections }: { sections: AreaSection[] }) {
  return (
    <ul className="area-sections">
      {sections.map((s) => (
        <li key={s.title} className={`area-section is-${s.status}`}>
          <div className="area-section__head">
            <h3>{s.title}</h3>
            <span className={`area-section__chip is-${s.status}`}>{LABEL[s.status]}</span>
          </div>
          <p>{s.description}</p>
          {s.note && <p className="area-section__note">{s.note}</p>}
          {s.to && s.status !== "backend" && (
            <Link to={s.to} className="area-section__link">Abrir →</Link>
          )}
        </li>
      ))}
    </ul>
  );
}
