// Proxy de PRUEBAS LOCALES. NO es Supabase: solo imita lo mínimo para ejecutar el código real de la app.
//  - /rest/v1/*    → PostgREST (la base de datos real con sus permisos reales)
//  - /auth/v1/*    → SIMULADOR de Supabase Auth (login por contraseña, sesión, cambio de contraseña). No verifica nada más.
//  - /storage/v1/* → SIMULADOR de Storage (acepta subidas y firma URL). NO evalúa permisos de archivos (eso se prueba en SQL, 0003).
import http from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
const target = Number(process.env.PGRST_PORT || 3000), listen = Number(process.env.PROXY_PORT || 54321);
const SECRET = "cimiento-local-test-secret-0123456789abcdef";
const IDS = { admin: 1, pastor: 2, lela: 3, tefa: 4, est1: 5, est2: 6 };
const uid = (n) => `a0000000-0000-0000-0000-00000000000${n}`;
// Usuarios del simulador (los 6 de prueba + los que cree la función admin-users durante las pruebas).
const USERS = new Map(Object.keys(IDS).map((k) => [k, { id: uid(IDS[k]), pw: "ClaveDePrueba#1", banned: false }]));
const psql = (q) => execFileSync("su", ["postgres", "-c", `psql -d ${process.env.PGDB || "cimiento_test"} -q -At -c "${q.replace(/"/g, '\\"')}"`], { encoding: "utf8" });
const SAFE = /^[a-z0-9._@-]+$/i;
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (claims) => { const h = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}`; return `${h}.${createHmac("sha256", SECRET).update(h).digest("base64url")}`; };
const local = (email) => String(email || "").split("@")[0];
const userObj = (k) => ({ id: USERS.get(k).id, aud: "authenticated", role: "authenticated", email: `${k}@cimiento.app`, app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });
const session = (k) => { const exp = Math.floor(Date.now() / 1000) + 3600; return { access_token: jwt({ sub: USERS.get(k).id, role: "authenticated", aud: "authenticated", email: `${k}@cimiento.app`, exp }), token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: `rt-${k}`, user: userObj(k) }; };
const send = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(body === undefined ? "" : JSON.stringify(body)); };
const readBody = (req) => new Promise((r) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => { try { r(d ? JSON.parse(d) : {}); } catch { r({}); } }); });
const who = (req) => { const t = (req.headers.authorization || "").replace(/^Bearer /, ""); try { const c = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()); return [...USERS.keys()].find((k) => USERS.get(k).id === c.sub); } catch { return undefined; } };

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/auth/v1/")) {
    const route = u.pathname.slice("/auth/v1/".length);
    if (route === "token" && u.searchParams.get("grant_type") === "password") {
      const b = await readBody(req), k = local(b.email), u = USERS.get(k);
      if (!u || u.pw !== b.password) return send(res, 400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials", error: "invalid_grant", error_description: "Invalid login credentials" });
      if (u.banned) return send(res, 400, { code: 400, error_code: "user_banned", msg: "User is banned" });
      return send(res, 200, session(k));
    }
    if (route === "token" && u.searchParams.get("grant_type") === "refresh_token") { const b = await readBody(req), k = String(b.refresh_token || "").replace("rt-", ""); return USERS.has(k) ? send(res, 200, session(k)) : send(res, 400, { error: "invalid_grant" }); }
    if (route === "user" && req.method === "GET") { const k = who(req); return k ? send(res, 200, userObj(k)) : send(res, 401, { msg: "invalid JWT" }); }
    if (route === "user" && req.method === "PUT") { const k = who(req), b = await readBody(req); if (!k) return send(res, 401, { msg: "invalid JWT" }); if (b.password) USERS.get(k).pw = b.password; return send(res, 200, userObj(k)); }
    if (route === "logout") return send(res, 204);
    // --- API de administración (la usa la función admin-users con la clave de servicio) ---
    if (route === "admin/users" && req.method === "POST") {
      const b = await readBody(req), k = local(b.email);
      if (!SAFE.test(String(b.email))) return send(res, 400, { msg: "email no válido" });
      if (USERS.has(k)) return send(res, 422, { code: 422, error_code: "email_exists", msg: "A user with this email address has already been registered" });
      const id = randomUUID(); USERS.set(k, { id, pw: b.password, banned: false });
      psql(`insert into auth.users(id, email) values ('${id}', '${b.email}')`);
      return send(res, 200, userObj(k));
    }
    const am = route.match(/^admin\/users\/([0-9a-f-]{36})$/);
    if (am) {
      const k = [...USERS.keys()].find((x) => USERS.get(x).id === am[1]);
      if (!k) return send(res, 404, { code: 404, error_code: "user_not_found", msg: "User not found" });
      if (req.method === "PUT") { const b = await readBody(req); if (b.password) USERS.get(k).pw = b.password; if (b.ban_duration !== undefined) USERS.get(k).banned = b.ban_duration !== "none"; return send(res, 200, userObj(k)); }
      if (req.method === "DELETE") { USERS.delete(k); psql(`delete from auth.users where id = '${am[1]}'`); return send(res, 200, {}); }
    }
    return send(res, 404, { msg: "no simulado" });
  }
  if (u.pathname.startsWith("/storage/v1/")) {
    if (u.pathname.startsWith("/storage/v1/object/sign/") && req.method === "POST") { await readBody(req); return send(res, 200, { signedURL: u.pathname.replace("/storage/v1", "") + "?token=prueba" }); }
    if (u.pathname.startsWith("/storage/v1/object/") && (req.method === "POST" || req.method === "PUT")) { req.resume(); req.on("end", () => send(res, 200, { Key: u.pathname.replace("/storage/v1/object/", "") })); return; }
    if (req.method === "DELETE") { await readBody(req); return send(res, 200, []); }
    return send(res, 404, { msg: "no simulado" });
  }
  const url = req.url.replace(/^\/rest\/v1/, "") || "/";
  const p = http.request({ host: "127.0.0.1", port: target, path: url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on("error", (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(p);
}).listen(listen, () => console.log("proxy listo en", listen));
