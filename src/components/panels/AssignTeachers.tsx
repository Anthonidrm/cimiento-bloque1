import { useState } from "react";
import { listLessons, assignTeacher, unassignTeacher, assignmentHistory } from "../../backend/teaching";
import { listProfiles } from "../../backend/people";
import { Msg, Loading } from "./ui";
import { useAsync, useAction, fmtDate } from "./hooks";

const STATUS: Record<string, { label: string; cls: string }> = {
  A_TIEMPO: { label: "A tiempo", cls: "ok" },
  FUERA_DE_TIEMPO: { label: "Fuera de tiempo", cls: "warn" },
  ATRASADA: { label: "Atrasada", cls: "bad" },
  PENDIENTE: { label: "Pendiente", cls: "" },
  SIN_REFERENCIA: { label: "Sin clase anterior", cls: "" },
};

/** ASIGNAR MAESTRO (Administrador y Pastor): asignar, cambiar y quitar; cada lección muestra su maestro asignado. */
export default function AssignTeachers() {
  const lessons = useAsync(listLessons, []);
  const teachers = useAsync(() => listProfiles("MAESTRO"), []);
  const [pick, setPick] = useState<Record<number, string>>({});
  const [history, setHistory] = useState<{ week: number; rows: Awaited<ReturnType<typeof assignmentHistory>> } | null>(null);
  const act = useAction();

  if (lessons.loading || lessons.error) return <Loading state={lessons} />;
  const active = (teachers.data ?? []).filter((t) => t.active);
  const alerts = (lessons.data ?? []).filter((l) => l.assignment_status === "ATRASADA");

  return (
    <section className="pn-section">
      <h2>Asignar maestro</h2>
      <p>Cada lección muestra su maestro asignado. La asignación debe hacerse el mismo día de la lección anterior o antes; pasadas 4 horas del inicio de la lección anterior sin maestro, queda marcada como atrasada y se notifica al Pastor y al Administrador.</p>
      {alerts.length > 0 && <p className="pn-msg is-error" role="alert">⚠ {alerts.length} lección(es) sin maestro y atrasadas: semana {alerts.map((a) => a.week).join(", ")}.</p>}
      <Msg msg={act.msg} />
      <div className="pn-table-wrap">
        <table className="pn-table">
          <thead><tr><th>Semana</th><th>Lección</th><th>Maestro asignado</th><th>Estado</th><th>Asignar / cambiar</th></tr></thead>
          <tbody>
            {(lessons.data ?? []).map((l) => {
              const st = l.assignment_status ? STATUS[l.assignment_status] : undefined;
              return (
                <tr key={l.week}>
                  <td>{l.week}</td>
                  <td>{l.title ?? <em>Tema pendiente</em>}<br /><small>Módulo {l.module_id} — {l.module_title}</small></td>
                  <td><strong>{l.teacher_name ?? "Sin asignar"}</strong>{l.assigned_at && <><br /><small>{fmtDate(l.assigned_at)}</small></>}</td>
                  <td>{st ? <span className={`pn-chip ${st.cls}`}>{st.label}{l.days_late ? ` · ${l.days_late} día(s)` : ""}</span> : "—"}</td>
                  <td>
                    <div className="pn-inline">
                      <select aria-label={`Maestro para la semana ${l.week}`} value={pick[l.week] ?? l.teacher_id ?? ""} onChange={(e) => setPick((p) => ({ ...p, [l.week]: e.target.value }))}>
                        <option value="">— elegir maestro —</option>
                        {active.map((t) => <option key={t.id} value={t.id}>{t.display_name}</option>)}
                      </select>
                      <button type="button" className="pn-btn" disabled={act.busy || !(pick[l.week] ?? "") || (pick[l.week] ?? l.teacher_id) === l.teacher_id}
                        onClick={() => act.run(async () => { await assignTeacher(l.week, pick[l.week]); lessons.reload(); }, l.teacher_id ? "Maestro cambiado." : "Maestro asignado.")}>
                        {l.teacher_id ? "Cambiar" : "Asignar"}
                      </button>
                      {l.teacher_id && <button type="button" className="pn-btn secondary" disabled={act.busy} onClick={() => act.run(async () => { await unassignTeacher(l.week); setPick((p) => ({ ...p, [l.week]: "" })); lessons.reload(); }, "Maestro quitado.")}>Quitar</button>}
                      <button type="button" className="pn-btn secondary" onClick={async () => setHistory({ week: l.week, rows: await assignmentHistory(l.week) })}>Historial</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {history && (
        <div className="pn-card" style={{ marginTop: 12 }}>
          <strong>Historial de la semana {history.week}</strong>
          {history.rows.length === 0 ? <p>Sin cambios registrados.</p> : <ul>{history.rows.map((h) => <li key={h.id}>{fmtDate(h.done_at)} — {h.action}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}
