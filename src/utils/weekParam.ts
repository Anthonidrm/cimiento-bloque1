import { useParams } from "react-router-dom";

/**
 * React Router solo admite segmentos dinámicos COMPLETOS (":weekSlug"); no
 * admite parciales como "semana-:week". Por eso las rutas usan ":weekSlug" y
 * aquí se interpreta "semana-3" → 3. Las URLs públicas no cambian.
 * Devuelve NaN si el segmento no tiene el formato "semana-N".
 */
export function parseWeekSlug(slug: string | undefined): number {
  const m = /^semana-(\d{1,2})$/.exec(slug ?? "");
  return m ? Number(m[1]) : NaN;
}

export function useWeekParam(): number {
  const { weekSlug } = useParams<{ weekSlug: string }>();
  return parseWeekSlug(weekSlug);
}
