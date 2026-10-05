// Edge Function `send-deliveries` (Deno): envía por CORREO lo que está en la cola `notification_deliveries`
// (informes de clase, recordatorios). Se invoca por programación (pg_cron / Supabase Cron) o a mano.
// ESTADO: escrita, NO probada contra Resend/Supabase reales. Si faltan los secretos NO envía nada y lo dice
// (jamás marca como ENVIADA algo que no salió).
// Secretos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, MAIL_FROM (p. ej. "CIMIENTO <informes@tu-dominio>"),
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

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: pending } = await db.from("notification_deliveries").select("*").eq("status", "PENDIENTE").eq("channel", "CORREO").lt("attempts", 5).limit(50);
  let sent = 0, failed = 0;
  for (const d of pending ?? []) {
    const html = d.kind === "INFORME_CLASE" ? reportHtml(d.payload) : `<p>${esc(d.payload?.text ?? d.subject)}</p>`;
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [d.to_address], subject: d.subject, html }) });
    if (r.ok) { sent++; await db.from("notification_deliveries").update({ status: "ENVIADA", sent_at: new Date().toISOString(), attempts: d.attempts + 1 }).eq("id", d.id); }
    else { failed++; await db.from("notification_deliveries").update({ status: d.attempts + 1 >= 5 ? "ERROR" : "PENDIENTE", attempts: d.attempts + 1, last_error: (await r.text()).slice(0, 300) }).eq("id", d.id); }
  }
  return new Response(JSON.stringify({ sent, failed }), { headers: { "Content-Type": "application/json" } });
});
