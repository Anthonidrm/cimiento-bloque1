import { useState } from "react";
import Breadcrumbs from "../components/Breadcrumbs";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ResourcesList } from "../components/panels/ResourcesPanel";
import SectionIcon from "../components/SectionIcon";
import { CATEGORIES, getLibraryByCategory } from "../services/resourceService";
import "./Course.css";
import "./Resources.css";

/** Con backend, la biblioteca sale del almacenamiento privado; sin backend, de los archivos públicos del proyecto. */
export default function Resources() {
  const { backend } = useAuth();
  if (backend) {
    return (
      <div className="container page">
        <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Recursos" }]} />
        <header className="page-header">
          <p className="page-header__eyebrow">Biblioteca · Plan Anual</p>
          <h1>Recursos</h1>
          <p className="page-header__desc">Los archivos viven en almacenamiento privado y se abren con un enlace temporal.</p>
        </header>
        <ResourcesList />
      </div>
    );
  }
  return <LocalResources />;
}

function LocalResources() {
  const grouped = getLibraryByCategory();
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const items = grouped[active];

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Recursos" }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">Biblioteca · Plan Anual</p>
        <h1>Recursos</h1>
        <p className="page-header__desc">
          Todos los recursos reales del Plan Anual, organizados por tipo.
          Solo se muestran los que existen hoy (semanas 1–4, Módulo 1); a
          medida que se desarrollen más semanas, esta biblioteca crece con
          ellas.
        </p>
      </header>

      <div className="resource-tabs" role="tablist" aria-label="Categorías de recursos">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            role="tab"
            aria-selected={active === cat}
            className={`resource-tab ${active === cat ? "is-active" : ""}`}
            onClick={() => setActive(cat)}
          >
            {cat}
            <span className="resource-tab__count">{grouped[cat].length}</span>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="resource-empty">
          <SectionIcon name="resource" />
          <p>Todavía no hay recursos disponibles en esta categoría.</p>
        </div>
      ) : (
        <div className="resource-grid">
          {items.map((r) => (
            <a
              key={r.id}
              className="resource-card"
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="resource-card__icon">
                <SectionIcon name="resource" />
              </div>
              <div className="resource-card__body">
                <span className="resource-card__meta">
                  Semana {String(r.relatedWeek).padStart(2, "0")} · {r.relatedWeekTitle}
                </span>
                <h3>{r.name}</h3>
                <p>{r.description}</p>
                <Link
                  to={`/plan-anual/semana-${r.relatedWeek}`}
                  className="resource-card__lesson-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver semana en el Plan Anual →
                </Link>
                <span className="resource-card__cta">
                  {r.kind === "pdf" ? "Abrir PDF ↗" : "Abrir enlace ↗"}
                  {r.secondaryUrl && ` · también en .pptx`}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
