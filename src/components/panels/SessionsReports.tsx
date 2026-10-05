import { useState } from "react";
import { listSessions, listReports, reportDeliveries } from "../../backend/classes";
import { Loading } from "./ui";
import { useAsync, fmtDate, fmtDur } from "./hooks";

interface Content {
  lesson?: { week: number; title: string | null }; teacher?: { name: string }; date?: string; started_at?: string; ended_at?: string; duration_seconds?: number;
  students?: { id: string; name: string; attendance: string | null }[]; attendance?: Record<string, number>; activities?: unknown[]; interactions?: number;
  assignments?: { id: string; title: string; submissions: number }[]; presentation?: { seconds: number; slides_used: number }; observations?: string | null;
  results?: { students_scored: number; average_total: number | null };
}

/** Clases (sesiones) con asistencia y su INFORME DE CLASE. */
export function SessionsReports({ mode }: { mode: "clases" | "informes" }) {
  const sessions = useAsync(listSessions, []);
  const reports = useAsync(listReports, []);
  const deliveries = useAsync(reportDeliveries, []);
  const [open, setOpen] = useState<string | null>(null);
  if (sessions.loading || sessions.error) return <Loading state={sessions} />;
  const byId = new Map((reports.data ?? []).map((r) => [r.session_id, r]));
  const rows = (sessions.data ?? []).filter((s) => mode === "clases" || s.has_report);

  return (
    <section className="pn-section">
      <h2>{mode === "clases" ? "Clases" : "Informes de clase"}</h2>
      <p>{mode === "clases" ? "Sesiones iniciadas por los maestros: inicio, fin, duración y asistencia." : "Se genera un informe al finalizar cada clase. El envío por correo queda en cola hasta que exista un servicio de correo configurado."}</p>
      <div className="pn-table-wrap">
        <table className="pn-table">
          <thead><tr><th>Semana</th><th>Maestro</th><th>Inicio</th><th>Fin</th><th>Duración</th><th>Asistencia (P / A / E)</th><th>Estado</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8}>No hay {mode === "clases" ? "clases" : "informes"} todavía.</td></tr>}
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.week}</td><td>{s.teacher_name}</td><td>{fmtDate(s.started_at)}</td><td>{fmtDate(s.ended_at)}</td><td>{fmtDur(s.duration_seconds)}</td>
                <td>{s.present} / {s.absent} / {s.excused}</td>
                <td><span className={`pn-chip ${s.status === "EN_CURSO" ? "warn" : "ok"}`}>{s.status === "EN_CURSO" ? "En curso" : "Finalizada"}</span></td>
                <td>{byId.has(s.id) && <button type="button" className="pn-btn secondary" onClick={() => setOpen(open === s.id ? null : s.id)}>{open === s.id ? "Ocultar" : "Ver informe"}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && byId.get(open) && <ReportView c={byId.get(open)!.content as Content} />}
      {mode === "informes" && (deliveries.data ?? []).length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>Envíos por correo</h3>
          <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Destino</th><th>Asunto</th><th>Estado</th><th>Enviado</th></tr></thead><tbody>
            {(deliveries.data ?? []).map((d) => <tr key={d.id}><td>{d.to_address}</td><td>{d.subject}</td><td><span className={`pn-chip ${d.status === "ENVIADA" ? "ok" : d.status === "ERROR" ? "bad" : "warn"}`}>{d.status === "PENDIENTE" ? "En cola (sin enviar)" : d.status}</span></td><td>{fmtDate(d.sent_at)}</td></tr>)}
          </tbody></table></div>
        </>
      )}
    </section>
  );
}

export function ReportView({ c }: { c: Content }) {
  const a = c.attendance ?? {};
  return (
    <article className="pn-card" style={{ marginTop: 12 }} aria-label="Informe de clase">
      <h3>Informe de clase — Semana {c.lesson?.week}: {c.lesson?.title ?? "tema pendiente"}</h3>
      <p><strong>Maestro:</strong> {c.teacher?.name} · <strong>Fecha:</strong> {c.date} · <strong>Inicio:</strong> {fmtDate(c.started_at)} · <strong>Fin:</strong> {fmtDate(c.ended_at)} · <strong>Duración:</strong> {fmtDur(c.duration_seconds)}</p>
      <p><strong>Asistencia:</strong> presentes {a.PRESENTE ?? 0}, ausentes {a.AUSENTE ?? 0}, excusas {a.EXCUSA ?? 0}</p>
      <ul>{(c.students ?? []).map((s) => <li key={s.id}>{s.name}: {s.attendance ?? "sin registro"}</li>)}</ul>
      <p><strong>Presentación:</strong> {c.presentation?.slides_used ?? 0} diapositivas usadas, {fmtDur(c.presentation?.seconds)} · <strong>Actividades:</strong> {(c.activities ?? []).length} · <strong>Interacciones:</strong> {c.interactions ?? 0}</p>
      <p><strong>Tareas:</strong> {(c.assignments ?? []).map((t) => `${t.title} (${t.submissions} entregas)`).join("; ") || "ninguna"}</p>
      <p><strong>Resultados:</strong> {c.results?.students_scored ?? 0} estudiantes con puntuación, promedio {c.results?.average_total ?? "—"}</p>
      <p><strong>Observaciones:</strong> {c.observations ?? "—"}</p>
    </article>
  );
}
