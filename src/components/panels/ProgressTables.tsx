import { teacherProgress, studentProgress } from "../../backend/teaching";
import { Loading } from "./ui";
import { useAsync, fmtDate } from "./hooks";

const CHIP: Record<string, string> = { A_TIEMPO: "ok", FUERA_DE_TIEMPO: "warn", ATRASADA: "bad" };

/** Progreso de los maestros (lo ve el Administrador y el Pastor; el maestro solo ve el suyo por permisos del servidor). */
export function TeacherProgressTable({ title = "Progreso de maestros" }: { title?: string }) {
  const q = useAsync(teacherProgress, []);
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>{title}</h2>
      <p>Preparación calculada por el servidor: guía 45 % · examen 25 % · presentación 15 % · actividades obligatorias 15 % (suman 100 %).</p>
      <div className="pn-table-wrap">
        <table className="pn-table">
          <thead><tr><th>Maestro</th><th>Semana</th><th>Guía (45)</th><th>Examen (25)</th><th>Presentación (15)</th><th>Actividades (15)</th><th>Total</th><th>Asignación</th><th>Última actividad</th></tr></thead>
          <tbody>
            {(q.data ?? []).length === 0 && <tr><td colSpan={9}>Todavía no hay lecciones asignadas.</td></tr>}
            {(q.data ?? []).map((r) => (
              <tr key={`${r.teacher_id}-${r.week}`}>
                <td>{r.teacher_name}</td><td>{r.week}</td>
                <td>{r.guide_pts} <small>({r.guide_done}/23 apartados)</small></td>
                <td>{r.exam_completed ? r.exam_pts : <span className="pn-chip">Sin hacer</span>}</td>
                <td>{r.presentation_pts}</td>
                <td>{r.mandatory_pts} <small>({r.mandatory_done}/{r.mandatory_total})</small></td>
                <td><strong>{Math.round(r.total_pts)} %</strong></td>
                <td>{r.assignment_status ? <span className={`pn-chip ${CHIP[r.assignment_status] ?? ""}`}>{r.assignment_status.replace(/_/g, " ").toLowerCase()}{r.days_late ? ` · ${r.days_late} día(s)` : ""}</span> : "—"}</td>
                <td>{fmtDate(r.last_activity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Progreso de los estudiantes por lección: 4 × 25 = 100 puntos. */
export function StudentProgressTable({ title = "Progreso de estudiantes" }: { title?: string }) {
  const q = useAsync(studentProgress, []);
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>{title}</h2>
      <p>Asistencia 25 · Asignación 25 · Participación 25 · Examen 25 = 100 puntos por lección.</p>
      <div className="pn-table-wrap">
        <table className="pn-table">
          <thead><tr><th>Estudiante</th><th>Semana</th><th>Asistencia</th><th>Asignación</th><th>Participación</th><th>Examen</th><th>Total</th><th>👑</th><th>Última actividad</th></tr></thead>
          <tbody>
            {(q.data ?? []).length === 0 && <tr><td colSpan={9}>Todavía no hay puntuaciones.</td></tr>}
            {(q.data ?? []).map((r) => (
              <tr key={`${r.student_id}-${r.week}`}>
                <td>{r.student_name}</td><td>{r.week}</td><td>{r.attendance_pts}</td><td>{r.submission_pts}</td><td>{r.participation_pts}</td><td>{r.exam_pts}</td>
                <td><strong>{r.total} %</strong></td><td>{r.crowns}</td><td>{fmtDate(r.last_activity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
