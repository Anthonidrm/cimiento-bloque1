// Migra los archivos de public/ al almacenamiento PRIVADO de Supabase y crea/actualiza sus recursos.
// NO borra nada de public/ (eso se hace después de validar, a mano).  ESTADO: escrito, NO probado contra Supabase real.
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//   npx tsx --tsconfig tsconfig.app.json tools/backend/subir_recursos.ts --subido-por <uuid-del-administrador> [--simular]
//
// --simular: solo muestra qué haría (no necesita claves). La clave de servicio se usa SOLO en tu equipo, nunca en el front.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { planResource, storagePath } from "./rutas_recursos";

const args = process.argv.slice(2);
const dry = args.includes("--simular");
const by = args[args.indexOf("--subido-por") + 1];
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk("public").map((f) => relative("public", f).replace(/\\/g, "/")).map((p) => ({ p, plan: planResource(p) })).filter((x) => x.plan);
console.log(`${files.length} archivos de public/ se migrarían a recursos privados.`);

if (dry) { files.slice(0, 8).forEach((f) => console.log(`  ${f.p} → ${storagePath(f.plan!, 0, f.p.split("/").pop()!)}`)); process.exit(0); }
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !by) { console.error("Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o --subido-por."); process.exit(1); }

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let n = 0;
for (const { p, plan } of files) {
  const r = plan!; const name = p.split("/").pop()!; const path = storagePath(r, Date.now(), name);
  const up = await db.storage.from("recursos").upload(path, readFileSync(join("public", p)), { contentType: r.mime });
  if (up.error) throw new Error(`${p}: ${up.error.message}`);
  const found = await db.from("resources").select("id").eq("week", r.week).eq("kind", r.kind).eq("slot", r.slot).maybeSingle();
  let id = found.data?.id as string | undefined;
  if (!id) { const ins = await db.from("resources").insert({ week: r.week, kind: r.kind, slot: r.slot, title: r.title, audience: r.audience }).select("id").single(); if (ins.error) throw new Error(ins.error.message); id = ins.data.id; }
  const v = await db.from("resource_versions").insert({ resource_id: id, storage_path: path, filename: name, uploaded_by: by, is_current: true });
  if (v.error) throw new Error(v.error.message);
  n++;
}
console.log(`Listo: ${n} recursos subidos al bucket privado "recursos".`);
