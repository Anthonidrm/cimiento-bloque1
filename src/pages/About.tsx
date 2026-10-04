import Breadcrumbs from "../components/Breadcrumbs";
import { brand } from "../data/brand";
import "./Course.css";

export default function About() {
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Sobre CIMIENTO" }]} />

      <header className="page-header">
        <p className="page-header__eyebrow">{brand.category}</p>
        <h1>Sobre {brand.name}</h1>
        <p className="page-header__desc">{brand.slogan}</p>
      </header>

      <div className="lesson-body" style={{ maxWidth: "68ch" }}>
        <section className="lesson-section">
          <h2 className="lesson-section__title">Público</h2>
          <p>{brand.audience}</p>
        </section>
        <section className="lesson-section">
          <h2 className="lesson-section__title">Currículo</h2>
          <p>
            <strong>{brand.curriculum.name}</strong> — {brand.curriculum.description}
          </p>
        </section>
      </div>
    </div>
  );
}
