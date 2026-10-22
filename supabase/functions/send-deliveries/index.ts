// Edge Function `send-deliveries` (Deno): envía por CORREO lo que está en la cola `notification_deliveries`
// (informes de clase, recordatorios). Se invoca por programación (pg_cron / Supabase Cron) o a mano.
// ESTADO: escrita, NO probada contra Resend/Supabase reales. Si faltan los secretos NO envía nada y lo dice
// (jamás marca como ENVIADA algo que no salió).
// Secretos: SUPABASE_URL, SUPABASE_SECRET_KEYS, RESEND_API_KEY, MAIL_FROM (p. ej. "Cimiento <informes@micimiento.com>"),
//           CRON_SECRET (la llamada debe traer el encabezado x-cron-secret con este valor)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
const fmt = (s: unknown) => (s ? new Date(String(s)).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" }) : "—");

/** Informe de clase (payload = class_reports.content) → HTML. */
function reportHtml(p: any): string {
  const att = p.attendance ?? {};
  const rows = (p.students ?? []).map((s: any) => `<tr><td>${esc(s.name)}</td><td>${esc(s.attendance ?? "Sin registro")}</td></tr>`).join("");
  return `<h2>Informe de clase — Semana ${esc(p.lesson?.week)}: ${esc(p.lesson?.title)}</h2>
<p><b>Maestro:</b> ${esc(p.teacher?.name)}<br><b>Fecha:</b> ${esc(p.date)} · <b>Inicio:</b> ${fmt(p.started_at)} · <b>Fin:</b> ${fmt(p.ended_at)} · <b>Duración:</b> ${Math.round((p.duration_seconds ?? 0) / 60)} min</p>
<p><b>Asistencia:</b> presentes ${att.PRESENTE ?? 0}, ausentes ${att.AUSENTE ?? 0}, excusas ${att.EXCUSA ?? 0}</p>
<table border="1" cellpadding="4" cellspacing="0"><tr><th>Estudiante</th><th>Asistencia</th></tr>${rows}</table>
<p><b>Presentación:</b> ${esc(p.presentation?.slides_used)} diapositivas usadas, ${Math.round((p.presentation?.seconds ?? 0) / 60)} min.<br>
<b>Actividades:</b> ${(p.activities ?? []).length} · <b>Interacciones:</b> ${esc(p.interactions)} · <b>Tareas:</b> ${(p.assignments ?? []).length}<br>
<b>Resultados:</b> ${esc(p.results?.students_scored)} estudiantes con puntuación, promedio ${esc(p.results?.average_total)}</p>
<p><b>Observaciones:</b> ${esc(p.observations ?? "—")}</p>`;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return new Response(JSON.stringify({ error: "No autorizado." }), { status: 401 });
  const key = Deno.env.get("RESEND_API_KEY"), from = Deno.env.get("MAIL_FROM");
  if (!key || !from) return new Response(JSON.stringify({ sent: 0, note: "Proveedor de correo NO configurado (RESEND_API_KEY / MAIL_FROM). No se envió nada." }), { status: 200 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const rawSecretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  let serviceKey: string | undefined;
  try {
    const secretKeys = rawSecretKeys ? JSON.parse(rawSecretKeys) : {};
    serviceKey = secretKeys.default;
  } catch {
    return new Response(JSON.stringify({ error: "SUPABASE_SECRET_KEYS no contiene JSON válido." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Falta SUPABASE_URL o la clave default de SUPABASE_SECRET_KEYS." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: pending, error: queueError } = await db
    .from("notification_deliveries")
    .select("*")
    .eq("status", "PENDIENTE")
    .eq("channel", "CORREO")
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(50);

  if (queueError) {
    return new Response(JSON.stringify({ error: "No se pudo consultar la cola de correos.", details: queueError.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  let sent = 0, failed = 0;
  for (const d of pending ?? []) {
    const html = d.kind === "INFORME_CLASE" ? reportHtml(d.payload) : `<p>${esc(d.payload?.text ?? d.subject)}</p>`;
    let responseText = "";
    let ok = false;
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [d.to_address], subject: d.subject, html }),
      });
      ok = r.ok;
      if (!r.ok) responseText = (await r.text()).slice(0, 300);
    } catch (e) {
      responseText = String(e).slice(0, 300);
    }

    const nextAttempts = (Number(d.attempts) || 0) + 1;
    const update = ok
      ? { status: "ENVIADA", sent_at: new Date().toISOString(), attempts: nextAttempts, last_error: null }
      : { status: nextAttempts >= 5 ? "ERROR" : "PENDIENTE", attempts: nextAttempts, last_error: responseText || "Error desconocido al enviar." };
    const { error: updateError } = await db.from("notification_deliveries").update(update).eq("id", d.id);
    if (updateError) {
      failed++;
      console.error("No se pudo actualizar notification_deliveries", d.id, updateError.message);
      continue;
    }
    if (ok) sent++;
    else failed++;
  }

  return new Response(JSON.stringify({ sent, failed, processed: (pending ?? []).length }), { headers: { "Content-Type": "application/json" } });
});
