// Prueba la función de servidor `admin-users` ejecutando SU CÓDIGO REAL (supabase/functions/admin-users/index.ts) contra
// PostgreSQL real. Las llamadas de administración de Auth (crear/actualizar/borrar usuario) van al SIMULADOR del proxy; el resto
// (perfiles, roles, historial) es la base de datos real. Las funciones de la app que la invocan (adminCreateUser, …) se usan tal cual.
// Ejecutar con supabase/tests/e2e.sh
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ok, done } from "./shim";

const SECRET = "cimiento-local-test-secret-0123456789abcdef", URL = "http://127.0.0.1:54321", PW = "ClaveDePrueba#1";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (claims: object) => { const h = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ ...claims, exp: Math.floor(Date.now() / 1000) + 7200 })}`; return `${h}.${createHmac("sha256", SECRET).update(h).digest("base64url")}`; };
const uid = (n: number) => `a0000000-0000-0000-0000-00000000000${n}`;
function sql(q: string): string { writeFileSync("/tmp/edge.sql", q); return execFileSync("su", ["postgres", "-c", "psql -d cimiento_test -At -v ON_ERROR_STOP=1 -f /tmp/edge.sql"], { encoding: "utf8" }).trim(); }

// --- entorno Deno mínimo y carga del código real de la función ---
let handler!: (req: Request) => Promise<Response>;
(globalThis as any).Deno = {
  env: { get: (k: string) => ({ SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: jwt({ role: "service_role" }), AUTH_EMAIL_DOMAIN: "cimiento.app" } as Record<string, string>)[k] },
  serve: (h: typeof handler) => { handler = h; },
};
await import("../../supabase/functions/admin-users/index.ts");

const { setClientForTests } = await import("../../src/backend/client");
const P = await import("../../src/backend/people");
const { backendLogin, backendChangePassword } = await import("../../src/auth/backendAuth");
const anon = jwt({ role: "anon" });
let n = 0;
/** Cliente con el login de `user`; las llamadas a /functions/v1/admin-users se atienden con el código real de la función. */
async function clientFor(user: string, pass = PW): Promise<SupabaseClient> {
  const c = createClient(URL, anon, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: `edge-${++n}` },
    global: { fetch: (input, init) => (String(input).includes("/functions/v1/admin-users") ? handler(new Request(input as string, init)) : fetch(input as string, init)) },
  });
  const r = await c.auth.signInWithPassword({ email: `${user}@cimiento.app`, password: pass });
  if (r.error) throw new Error(`login ${user}: ${r.error.message}`);
  return c;
}
const as = async (u: string, p = PW) => setClientForTests(await clientFor(u, p));
const fails = async (f: () => Promise<unknown>) => { try { await f(); return null; } catch (e) { return (e as Error).message; } };
const profile = (u: string) => sql(`select role || '/' || active || '/' || must_change_password || '/' || coalesce(created_by::text, '') from profiles where username = '${u}'`);

sql(`update profiles set must_change_password = false;`);

console.log("1) Quién puede llamar a la función");
const raw = await handler(new Request(`${URL}/functions/v1/admin-users`, { method: "POST", body: JSON.stringify({ action: "ping" }) }));
ok(raw.status === 401, "Sin sesión: 401");
for (const who of ["pastor", "lela", "est1"]) {
  await as(who);
  const msg = await fails(() => P.adminCreateUser({ username: "intruso", displayName: "x", role: "ADMINISTRADOR", password: "Temporal#2026" }));
  ok(!!msg && /Solo el Administrador/.test(msg), `${who}: rechazado con el mensaje real de la función («${msg}»)`);
}
ok(sql(`select count(*) from profiles where username = 'intruso'`) === "0", "Nadie sin rol de Administrador pudo crear usuarios");

console.log("2) El Administrador crea Pastor, Maestro y Estudiante");
await as("admin");
const ping = await P.adminPing();
ok(ping.ok === true && ping.emailDomain === "cimiento.app", "ping: la función está activa y usa el dominio interno esperado");
ok(/8 caracteres/.test((await fails(() => P.adminCreateUser({ username: "debil", displayName: "x", role: "MAESTRO", password: "corta" }))) ?? ""), "Contraseña corta rechazada, con su motivo real");
ok(/Usuario: 3–32/.test((await fails(() => P.adminCreateUser({ username: "Mal Usuario!", displayName: "x", role: "MAESTRO", password: "Temporal#2026" }))) ?? ""), "Nombre de usuario no válido rechazado");
for (const [u, name, role] of [["pastor2", "Pastor Dos", "PASTOR"], ["maestro3", "Maestro Tres", "MAESTRO"], ["estudiante3", "Estudiante Tres", "ESTUDIANTE"]] as const) {
  const r = await P.adminCreateUser({ username: u, displayName: name, role, password: "Temporal#2026" });
  ok(r.ok === true && !!r.id, `Creado ${role.toLowerCase()} «${u}»`);
  ok(profile(u) === `${role}/true/true/${uid(1)}`, `${u}: rol ${role}, activo, debe definir su contraseña, creado por el Administrador`);
}
ok(/ya|already|registered/i.test((await fails(() => P.adminCreateUser({ username: "pastor2", displayName: "x", role: "PASTOR", password: "Temporal#2026" }))) ?? ""), "No se puede crear dos veces el mismo usuario");
ok(sql(`select count(*) from profiles where username = 'pastor2'`) === "1", "…y no queda un perfil duplicado");
sql(`insert into auth.users(id, email) values ('b0000000-0000-0000-0000-000000000001', 'otro@cimiento.app'); insert into profiles(id, username, display_name, role) values ('b0000000-0000-0000-0000-000000000001', 'choque', 'Otro', 'MAESTRO');`);
const orphan = await fails(() => P.adminCreateUser({ username: "choque", displayName: "x", role: "MAESTRO", password: "Temporal#2026" }));
ok(!!orphan, "Si el perfil no se puede crear, la función falla…");
ok(sql(`select count(*) from auth.users where email = 'choque@cimiento.app'`) === "0", "…y deshace el usuario de Auth (no quedan usuarios huérfanos)");

console.log("3) Primer acceso del usuario recién creado");
const first = await (async () => { setClientForTests(createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "edge-first" } })); return backendLogin("pastor2", "Temporal#2026"); })();
ok(first.ok && first.session.role === "PASTOR" && first.session.mustChangePassword === true, "El Pastor creado entra con la contraseña temporal y se le exige definir la suya");
const short = await backendChangePassword("pastor2", "Temporal#2026", "corta");
ok(!short.ok && /8 caracteres/.test((short as { error: string }).error), "Una contraseña nueva demasiado corta se rechaza (con su motivo)");
ok((await backendChangePassword("pastor2", "Temporal#2026", "MiClaveNueva#2026")).ok, "Define su contraseña");
ok(profile("pastor2").split("/")[2] === "false", "El servidor limpia la marca de primer acceso");
setClientForTests(createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "edge-first2" } }));
ok((await backendLogin("pastor2", "MiClaveNueva#2026")).ok && !(await backendLogin("pastor2", "Temporal#2026")).ok, "Entra con la nueva; la temporal ya no sirve");

console.log("4) Cambiar rol, activar/desactivar, restablecer contraseña, quitar acceso");
await as("admin");
const id3 = sql(`select id from profiles where username = 'maestro3'`);
ok((await P.adminUpdateUser(id3, { role: "PASTOR" })).ok && profile("maestro3").startsWith("PASTOR/"), "Cambio de rol");
await P.adminUpdateUser(id3, { role: "MAESTRO", displayName: "Maestro Tres B" });
ok(profile("maestro3").startsWith("MAESTRO/") && sql(`select display_name from profiles where username = 'maestro3'`) === "Maestro Tres B", "Cambio de rol y de nombre");
await P.adminUpdateUser(id3, { active: false });
setClientForTests(createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "edge-b1" } }));
const banned = await backendLogin("maestro3", "Temporal#2026");
ok(profile("maestro3").split("/")[1] === "false" && !banned.ok && /desactivado/.test((banned as { error: string }).error), "Desactivado: no puede entrar y la app le explica por qué");
await as("admin"); await P.adminUpdateUser(id3, { active: true });
setClientForTests(createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "edge-b2" } }));
ok((await backendLogin("maestro3", "Temporal#2026")).ok, "Reactivado: vuelve a entrar");
await as("admin");
ok(/propio rol|desactivarte/.test((await fails(() => P.adminUpdateUser(uid(1), { role: "MAESTRO" }))) ?? ""), "El Administrador no puede quitarse su propio rol");
ok(/desactivarte|propio/.test((await fails(() => P.adminUpdateUser(uid(1), { active: false }))) ?? ""), "…ni desactivarse");
ok(/a ti mismo/.test((await fails(() => P.adminRemoveAccess(uid(1)))) ?? ""), "…ni quitarse el acceso");
ok(/8 caracteres/.test((await fails(() => P.adminResetPassword(id3, "corta"))) ?? ""), "Restablecer con contraseña corta: rechazado");
await P.adminResetPassword(id3, "OtraTemporal#2026");
ok(profile("maestro3").split("/")[2] === "true", "Restablecer contraseña: vuelve a exigir el primer acceso");
setClientForTests(createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "edge-b3" } }));
ok((await backendLogin("maestro3", "OtraTemporal#2026")).ok && !(await backendLogin("maestro3", "Temporal#2026")).ok, "Entra con la contraseña restablecida; la anterior ya no sirve");
await as("admin");
const ide = sql(`select id from profiles where username = 'estudiante3'`);
await P.adminRemoveAccess(ide);
setClientForTests(createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "edge-b4" } }));
ok(profile("estudiante3").split("/")[1] === "false" && !(await backendLogin("estudiante3", "Temporal#2026")).ok, "Quitar acceso: queda inactivo y no puede entrar (sus datos se conservan)");

console.log("4b) Servidor inaccesible o mal configurado");
setClientForTests(createClient("http://127.0.0.1:9", anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: "edge-down" } }));
const down = await backendLogin("admin", PW);
ok(!down.ok && /No se pudo conectar con el servidor/.test((down as { error: string }).error), "Si la URL del servidor es incorrecta, el login lo dice (no finge 'contraseña incorrecta')");
await as("admin");

console.log("5) Historial y datos de contraseña");
ok(Number(sql(`select count(*) from change_log where table_name = 'admin-users' and done_by = '${uid(1)}'`)) >= 8, "El historial registra las acciones del Administrador (con su autor)");
ok(sql(`select count(*) from change_log where table_name = 'admin-users' and (new_data::text ilike '%Temporal%' or new_data::text ilike '%password%')`) === "0", "El historial NO guarda contraseñas");
ok(sql(`select count(*) from information_schema.columns where table_schema = 'public' and column_name ilike '%password%' and column_name <> 'must_change_password'`) === "0", "Ninguna tabla propia guarda contraseñas (viven solo en Supabase Auth)");
done();
