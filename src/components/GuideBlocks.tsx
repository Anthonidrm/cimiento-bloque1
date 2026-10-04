import type { GuideBlock } from "../data/guideSections";

/** Renderiza los bloques de un apartado de la guía (pantalla e impresión). */
export default function GuideBlocks({
  blocks,
  printMode = false,
  onLinkClick,
}: {
  blocks: GuideBlock[];
  printMode?: boolean;
  onLinkClick?: (href: string) => void;
}) {
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.t) {
          case "p":
            return <p key={i}>{b.text}</p>;
          case "h":
            return <h3 key={i} className="guide-h">{b.text}</h3>;
          case "ul":
            return (
              <ul key={i}>
                {b.items.map((it, j) => <li key={j}>{it}</li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={i}>
                {b.items.map((it, j) => <li key={j}>{it}</li>)}
              </ol>
            );
          case "kv":
            return (
              <dl key={i} className="guide-kv">
                {b.pairs.map(([k, v], j) => (
                  <div key={j}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            );
          case "quote":
            return (
              <blockquote key={i} className="guide-quote">
                “{b.text}”
                {b.cite && <span>{b.cite}</span>}
              </blockquote>
            );
          case "note":
            return <p key={i} className="guide-note">{b.text}</p>;
          case "links":
            return printMode ? (
              <ul key={i} className="guide-links-print">
                {b.links.map((l, j) => <li key={j}>Recurso: {l.label}</li>)}
              </ul>
            ) : (
              <div key={i} className="guide-links">
                {b.links.map((l, j) => (
                  <a
                    key={j}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onLinkClick?.(l.href)}
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
