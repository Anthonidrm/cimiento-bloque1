import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminId = process.env.ADMIN_ID;
if (!url || !key || !adminId) {
  console.error("Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o ADMIN_ID.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
let failed = false;
const check = (name: string, error?: { message: string } | null) => {
  if (error) { failed = true; console.log("ERROR: " + name + " — " + error.message); }
  else console.log("OK: " + name);
};
const buckets = await db.storage.listBuckets();
check("acceso al almacenamiento", buckets.error);
if (!buckets.error) check('bucket privado "recursos" existe', buckets.data.some(b => b.name === "recursos" && !b.public) ? null : {message:'No existe o no es privado'});
const resources = await db.from("resources").select("id,week,kind,slot,title,audience").limit(1);
check("tabla resources y columnas requeridas", resources.error);
const versions = await db.from("resource_versions").select("id,resource_id,storage_path,filename,uploaded_by,is_current").limit(1);
check("tabla resource_versions y columnas requeridas", versions.error);
const user = await db.auth.admin.getUserById(adminId);
check("UUID de administrador pertenece a este proyecto", user.error || !user.data.user ? {message:"No se encontró ese usuario en este proyecto"} : null);
if (failed) {
  console.error("PREVALIDACIÓN FALLIDA. No se cargó ni modificó ningún recurso.");
  process.exit(1);
}
console.log("PREVALIDACIÓN CORRECTA. No se modificó Supabase; ya se puede revisar el siguiente paso.");
