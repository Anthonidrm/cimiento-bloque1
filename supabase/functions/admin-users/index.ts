// Edge Function `admin-users` (Deno). ÚNICO lugar donde se usa la clave service_role.
// Solo el ADMINISTRADOR puede llamarla. El navegador nunca ve contraseñas ni la clave de servicio.
// Acciones: ping | create | update | reset_password | remove_access
// ESTADO: escrita y revisada, NO probada contra un proyecto Supabase real (no hay cuenta todavía).
// Secretos requeridos (Supabase → Edge Functions → Secrets): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Opcional: AUTH_EMAIL_DOMAIN (por defecto "cimiento.app"; debe coincidir con VITE_AUTH_EMAIL_DOMAIN del front).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ROLES = ["ADMINISTRADOR", "PASTOR", "MAESTRO", "ESTUDIANTE"];
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const strong = (p: unknown) => typeof p === "string" && p.length >= 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const domain = Deno.env.get("AUTH_EMAIL_DOMAIN") ?? "cimiento.app";

    // 1) Quién llama: se valida el JWT y se exige rol ADMINISTRADOR activo (el Pastor NO puede).
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: who, error: whoErr } = await admin.auth.getUser(jwt);
    if (whoErr || !who.user) return json({ error: "Sin sesión." }, 401);
    const { data: me } = await admin.from("profiles").select("role, active").eq("id", who.user.id).single();
    if (!me || !me.active || me.role !== "ADMINISTRADOR") return json({ error: "Solo el Administrador puede administrar usuarios." }, 403);

    const body = await req.json();
    const log = (action: string, id: string, extra: Record<string, unknown> = {}) =>
      admin.from("change_log").insert({ table_name: "admin-users", row_key: id, action: `ADMIN_USERS_${action}`, new_data: extra, done_by: who.user.id });
    const ban = (id: string, active: boolean) => admin.auth.admin.updateUserById(id, { ban_duration: active ? "none" : "876000h" });

    switch (body.action) {
      case "ping":
        // Diagnóstico: confirma que la función está desplegada y con qué dominio interno trabaja (debe ser igual a VITE_AUTH_EMAIL_DOMAIN).
        return json({ ok: true, service: "admin-users", emailDomain: domain });
      case "create": {
        const username = String(body.username ?? "").trim().toLowerCase();
        if (!/^[a-z0-9._-]{3,32}$/.test(username)) return json({ error: "Usuario: 3–32 caracteres (letras, números, . _ -)." }, 400);
        if (!ROLES.includes(body.role)) return json({ error: "Rol no válido." }, 400);
        if (!strong(body.password)) return json({ error: "La contraseña inicial debe tener al menos 8 caracteres." }, 400);
        const { data: created, error } = await admin.auth.admin.createUser({ email: `${username}@${domain}`, password: body.password, email_confirm: true });
        if (error || !created.user) return json({ error: error?.message ?? "No se pudo crear el usuario." }, 400);
        const { error: pe } = await admin.from("profiles").insert({ id: created.user.id, username, display_name: String(body.displayName ?? username), role: body.role, must_change_password: true, created_by: who.user.id });
        if (pe) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: pe.message }, 400); }
        await log("CREATE", created.user.id, { username, role: body.role });
        return json({ ok: true, id: created.user.id });
      }
      case "update": {
        if (body.id === who.user.id && (body.role !== undefined || body.active === false)) return json({ error: "No puedes cambiar tu propio rol ni desactivarte." }, 400);
        const patch: Record<string, unknown> = {};
        if (body.role !== undefined) { if (!ROLES.includes(body.role)) return json({ error: "Rol no válido." }, 400); patch.role = body.role; }
        if (body.displayName !== undefined) patch.display_name = String(body.displayName);
        if (body.active !== undefined) patch.active = Boolean(body.active);
        const { error } = await admin.from("profiles").update(patch).eq("id", body.id);
        if (error) return json({ error: error.message }, 400);
        if (body.active !== undefined) await ban(body.id, Boolean(body.active));
        await log("UPDATE", body.id, patch);
        return json({ ok: true });
      }
      case "reset_password": {
        // Restablecimiento seguro: el Administrador define una contraseña temporal; nunca puede ver la actual.
        if (!strong(body.password)) return json({ error: "La contraseña temporal debe tener al menos 8 caracteres." }, 400);
        const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password });
        if (error) return json({ error: error.message }, 400);
        await admin.from("profiles").update({ must_change_password: true }).eq("id", body.id);
        await log("RESET_PASSWORD", body.id);
        return json({ ok: true });
      }
      case "remove_access": {
        if (body.id === who.user.id) return json({ error: "No puedes quitarte el acceso a ti mismo." }, 400);
        await admin.from("profiles").update({ active: false }).eq("id", body.id);
        await ban(body.id, false);
        await log("REMOVE_ACCESS", body.id);
        return json({ ok: true });
      }
      default:
        return json({ error: "Acción desconocida." }, 400);
    }
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
