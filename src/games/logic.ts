// Lógica pura de los juegos/pruebas del estudiante (se prueba sin pantalla). El contenido viene del versículo REAL de la semana.
export const words = (t: string) => t.split(/\s+/).filter(Boolean);
/** Compara sin importar mayúsculas, acentos ni signos de puntuación (los niños no pierden puntos por eso). */
export const norm = (w: string) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** Orden pseudoaleatorio estable (misma semilla → mismo orden) que nunca deja las palabras en su orden original. */
export function shuffled<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed || 1;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let k = 0; k < 4; k++) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    if (a.length < 2 || a.some((x, i) => x !== items[i])) break;
  }
  return a;
}

/** ORDENAR_PALABRAS: porcentaje de palabras en su lugar correcto. */
export function scoreOrder(answer: string[], verse: string): number {
  const right = words(verse);
  if (!right.length) return 0;
  return Math.round((100 * right.filter((w, i) => answer[i] !== undefined && norm(answer[i]) === norm(w)).length) / right.length);
}

/** COMPLETAR_VERSICULO: porcentaje de espacios en blanco correctos. `answers[k]` corresponde a `blanks[k]`. */
export function scoreBlanks(answers: string[], verse: string, blanks: number[]): number {
  const w = words(verse);
  if (!blanks.length) return 0;
  return Math.round((100 * blanks.filter((idx, k) => norm(answers[k] ?? "") === norm(w[idx] ?? "\u0000")).length) / blanks.length);
}
