import type { WeekGuide } from "../data/weekTypes";
import { buildGuideSections } from "../data/guideSections";
import { getGuideExtras } from "../data/guideExtras";
import { modules } from "../data/modules";
import GuideBlocks from "./GuideBlocks";
import { ChildBoy, ChildGirl } from "./characters";
import cimientoLogo from "../assets/logo-cimiento.png";
import churchBadge from "../assets/logo-ieoh-badge.png";
import "./PrintableWeekGuide.css";

/** Versión imprimible: los 23 apartados completos, fondo blanco, márgenes de impresión. */
export default function PrintableWeekGuide({ week }: { week: WeekGuide }) {
  const sections = buildGuideSections(week);
  const mod = modules.find((m) => m.id === week.module);
  const phrase = getGuideExtras(week.week)?.memoryPhrase;

  return (
    <div className="print-week-guide">
      <header className="pwg__header">
        <div className="pwg__logos">
          <img src={cimientoLogo} alt="CIMIENTO" className="pwg__logo" />
          <img src={churchBadge} alt="IEOH" className="pwg__badge" />
          <span className="pwg__chars">
            <ChildGirl size={64} pose="wave" />
            <ChildBoy size={64} pose="cheer" />
          </span>
        </div>
        <p className="pwg__brand">
          CIMIENTO · Guía del Maestro · Plan Anual · Módulo {week.module}
          {mod ? ` — ${mod.title}` : ""}
        </p>
        <h1>
          Semana {week.week} — {week.title}
        </h1>
        {phrase && <p className="pwg__phrase">«{phrase}»</p>}
      </header>

      {sections.map((s) => (
        <section key={s.key} className="pwg__block">
          <h2>
            <span className="pwg__num">{String(s.number).padStart(2, "0")}</span> {s.title}
          </h2>
          <GuideBlocks blocks={s.blocks} printMode />
        </section>
      ))}

      <footer className="pwg__footer">
        CIMIENTO — Construyendo vidas sobre Cristo. · Semana {week.week}: {week.title}
      </footer>
    </div>
  );
}
