// Genera las semillas SQL a partir de los datos reales de la app (no se escriben a mano):
//   supabase/seed/01_lessons.sql        títulos de las lecciones desarrolladas
//   supabase/seed/02_exam_questions.sql claves del examen del maestro (el servidor califica; el maestro nunca las ve)
// Ejecutar desde la raíz del repo:  npx tsx --tsconfig tsconfig.app.json tools/backend/exportar_semillas.ts
import { writeFileSync, mkdirSync } from "node:fs";
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
