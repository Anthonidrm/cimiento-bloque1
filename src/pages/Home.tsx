import { Link } from "react-router-dom";
import logo from "../assets/logo-cimiento.png";
import { ChildBoy, ChildGirl } from "../components/characters";
import { brand } from "../data/brand";
import { getAllWeeks, getModules } from "../services/weekService";
import "./Home.css";

export default function Home() {
  const weeks = getAllWeeks();
  const modules = getModules();
  const ageGroups = 3;
  const upcomingWeeks = weeks.filter((w) => w.status === "developed").slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <img src={logo} alt={`${brand.name} — logo oficial`} className="hero__logo" />
          <p className="hero__eyebrow">{brand.category}</p>
          <h1 className="hero__slogan">{brand.slogan}</h1>
          <span className="hero__rule" aria-hidden="true" />
          <p className="hero__desc">
            {brand.name} es un {brand.program.description.toLowerCase()} Un solo
            lugar para que maestros y servidores preparen cada clase con
            claridad, semana a semana.
          </p>

          <div className="hero__actions">
            <Link to="/sobre-cimiento" className="btn btn--ghost">
              Conocer CIMIENTO
            </Link>
            <Link to="/plan-anual" className="btn btn--primary">
              Ver el Plan Anual
            </Link>
            <Link to="/maestros" className="btn btn--ghost">
              Área del maestro
            </Link>
          </div>

          <div className="hero__chars" aria-hidden="true">
            <ChildGirl size={150} pose="wave" />
            <ChildBoy size={150} pose="cheer" />
          </div>

          <dl className="hero__stats">
            <div>
              <dt>{brand.program.totalWeeks}</dt>
              <dd>semanas</dd>
            </div>
            <div>
              <dt>{brand.program.totalModules}</dt>
              <dd>módulos</dd>
            </div>
            <div>
              <dt>{ageGroups}</dt>
              <dd>grupos de edad</dd>
            </div>
            <div>
              <dt>1</dt>
              <dd>formación bíblica</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="container home-preview">
        <div className="home-preview__head">
          <h2>El Plan Anual, semana a semana</h2>
          <Link to="/plan-anual" className="home-preview__link">
            Ver las 52 semanas →
          </Link>
        </div>
        <div className="home-preview__grid">
          {upcomingWeeks.map((week) => (
            <Link
              key={week.week}
              to={`/plan-anual/semana-${week.week}`}
              className="home-preview__card"
            >
              <span>Semana {String(week.week).padStart(2, "0")}</span>
              <strong>{week.title}</strong>
              <p>{week.centralTruth}</p>
            </Link>
          ))}
        </div>
        <p className="home-preview__modules-note">
          Las 52 semanas están organizadas en {modules.length} módulos
          doctrinales, todos dentro del mismo Plan Anual.
        </p>
      </section>
    </>
  );
}
