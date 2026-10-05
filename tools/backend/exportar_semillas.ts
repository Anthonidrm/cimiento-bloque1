// Genera las semillas SQL a partir de los datos reales de la app (no se escriben a mano):
//   supabase/seed/01_lessons.sql        títulos de las lecciones desarrolladas
//   supabase/seed/02_exam_questions.sql claves del examen del maestro (el servidor califica; el maestro nunca las ve)
// Ejecutar desde la raíz del repo:  npx tsx --tsconfig tsconfig.app.json tools/backend/exportar_semillas.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { weeks } from "../../src/data/weeks";

const q = (s: string | null | undefined) => (s == null ? "null" : `'${s.replace(/'/g, "''")}'`);
mkdirSync("supabase/seed", { recursive: true });

const developed = weeks.filter((w) => w.status === "developed");
let lessons = "-- Generado por tools/backend/exportar_semillas.ts. No editar a mano.\n";
for (const w of developed) lessons += `update lessons set title = ${q(w.title)}, developed = true where week = ${w.week};\n`;
writeFileSync("supabase/seed/01_lessons.sql", lessons);

let exam = "-- Generado por tools/backend/exportar_semillas.ts. No editar a mano.\n-- Claves de respuesta del examen del maestro (needs_review = pendiente de revisión pastoral).\n";
exam += "insert into exam_questions (question_id, week, kind, correct_option, pairs, needs_review) values\n";
const rows: string[] = [];
for (const w of developed)
  for (const e of w.examQuestions) {
    const pairs = e.type === "matching" ? q(JSON.stringify(e.pairs)) + "::jsonb" : "null";
    rows.push(`  (${q(e.id)}, ${w.week}, ${q(e.type)}, ${e.type === "matching" ? "null" : q(e.correctOptionId)}, ${pairs}, ${e.needsPastoralReview ? "true" : "false"})`);
  }
exam += rows.join(",\n") + "\non conflict (question_id) do update set correct_option = excluded.correct_option, pairs = excluded.pairs, needs_review = excluded.needs_review;\n";
writeFileSync("supabase/seed/02_exam_questions.sql", exam);
console.log(`semillas: ${developed.length} lecciones, ${rows.length} preguntas de examen`);

// ---------- Juegos y pruebas por lección: salen del VERSÍCULO REAL de cada semana (nada inventado) ----------
// ORDENAR_PALABRAS: juego (no puntúa en el examen del estudiante).
// COMPLETAR_VERSICULO: prueba; cuenta como "examen" del estudiante (25 puntos). Que el versículo sirva de examen del estudiante es
//   una decisión pastoral pendiente de confirmar (ver docs/PENDIENTES_PROXIMAS_FASES.md).
const uuid = (key: string) => { const h = createHash("sha1").update(key).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const words = (t: string) => t.split(/\s+/).filter(Boolean);
let games = "-- Generado por tools/backend/exportar_semillas.ts. No editar a mano.\n";
for (const w of developed) {
  const text = w.verseRVR1960.text, ref = w.verseRVR1960.ref;
  const ws = words(text);
  const blanks: number[] = [];
  for (let i = 2; i < ws.length && blanks.length < 4; i += 3) if (ws[i].replace(/[^\p{L}]/gu, "").length >= 4) blanks.push(i);
  const rows = [
    [uuid(`w${w.week}-ordenar`), "ORDENAR_PALABRAS", `Ordena el versículo (${ref})`, { text, ref }, false],
    [uuid(`w${w.week}-completar`), "COMPLETAR_VERSICULO", `Completa el versículo (${ref})`, { text, ref, blanks }, true],
  ] as const;
  for (const [id, kind, title, config, exam] of rows)
    games += `insert into games (id, week, kind, title, config, active, counts_as_exam, max_score) values (${q(id)}, ${w.week}, ${q(kind)}, ${q(title)}, ${q(JSON.stringify(config))}::jsonb, true, ${exam}, 100) on conflict (id) do update set config = excluded.config, title = excluded.title;\n`;
}
writeFileSync("supabase/seed/03_games.sql", games);
console.log(`juegos: ${developed.length * 2} (2 por semana desarrollada)`);
