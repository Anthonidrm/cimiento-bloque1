import { useState } from "react";
import { listAttendance, markAttendance, logEvent, addNote } from "../../backend/classes";
import { useClassStudents } from "./classroomHooks";
import { refreshDuties } from "../../backend/sync";
import { listTasks, listSubmissions, createTask, gradeSubmission, setParticipation, listActivities, markActivityDone, listIntegrationActivities, assignIntegration, registerParticipation, signedUrl } from "../../backend/students";
import type { AttendanceStatus, Profile } from "../../backend/types";
import { Msg, Loading } from "../panels/ui";
import { useAsync, useAction } from "../panels/hooks";

/** PASE DE LISTA + puntos de participación por estudiante. Alimenta el progreso automáticamente. */
export function AttendanceList({ sessionId, week, groupId, canEdit }: { sessionId: string; week: number; groupId: string | null; canEdit: boolean }) {
  const { list, loading, error } = useClassStudents(groupId);
  const att = useAsync(() => listAttendance(sessionId), [sessionId]);
  const act = useAction();
  const [part, setPart] = useState<Record<string, number>>({});
  if (loading || att.loading || error) return <Loading state={{ loading: loading || att.loading, error: error ?? att.error }} />;
  const cur = new Map((att.data ?? []).map((a) => [a.student_id, a.status]));
  const OPTS: { s: AttendanceStatus; label: string }[] = [{ s: "PRESENTE", label: "Presente" }, { s: "AUSENTE", label: "Ausente" }, { s: "EXCUSA", label: "Excusa" }];
  return (
    <section className="pn-section">
      <h2>Pase de lista</h2>
      <Msg msg={act.msg} />
      {list.length === 0 ? <p>No hay estudiantes en esta clase. El Administrador los asigna a un grupo.</p> : (
        <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Estudiante</th><th>Asistencia</th><th>Participación (0–25)</th></tr></thead><tbody>
          {list.map((s) => (
            <tr key={s.id}>
              <td>{s.display_name}</td>
              <td><div className="pn-inline" role="group" aria-label={`Asistencia de ${s.display_name}`}>{OPTS.map((o) => (
                <button key={o.s} type="button" className={`pn-btn ${cur.get(s.id) === o.s ? "" : "secondary"}`} disabled={!canEdit || act.busy} aria-pressed={cur.get(s.id) === o.s}
                  onClick={() => act.run(async () => { await markAttendance(sessionId, s.id, o.s); att.reload(); await refreshDuties(week); }, `${s.display_name}: ${o.label.toLowerCase()}.`)}>{o.label}</button>))}</div></td>
              <td><div className="pn-inline"><input type="number" min={0} max={25} aria-label={`Participación de ${s.display_name}`} value={part[s.id] ?? ""} onChange={(e) => setPart({ ...part, [s.id]: +e.target.value })} style={{ width: 70 }} />
                <button type="button" className="pn-btn secondary" disabled={part[s.id] === undefined || act.busy} onClick={() => act.run(() => setParticipation(s.id, week, part[s.id]), "Participación guardada.")}>Guardar</button></div></td>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </section>
  );
}

/** Registro de actividades, interacciones y observaciones de la clase en curso. */
export function SessionLog({ sessionId }: { sessionId: string }) {
  const act = useAction();
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  return (
    <section className="pn-section">
      <h2>Registro de la clase</h2>
      <Msg msg={act.msg} />
      <div className="pn-form">
        <label>Actividad realizada<input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: dinámica de apertura" /></label>
        <button type="button" className="pn-btn" disabled={!text || act.busy} onClick={() => act.run(async () => { await logEvent(sessionId, "ACTIVIDAD", { text }); setText(""); }, "Actividad registrada.")}>Registrar actividad</button>
        <button type="button" className="pn-btn secondary" disabled={act.busy} onClick={() => act.run(() => logEvent(sessionId, "INTERACCION", {}), "Interacción registrada.")}>+ Interacción</button>
      </div>
      <div className="pn-form">
        <label style={{ gridColumn: "1 / -1" }}>Observaciones de la clase<textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <button type="button" className="pn-btn" disabled={!note || act.busy} onClick={() => act.run(async () => { await addNote(sessionId, note); setNote(""); }, "Observación guardada.")}>Guardar observación</button>
      </div>
    </section>
  );
}

/** Tareas de la lección: crear (período: desde ahora hasta el inicio de la próxima clase) y revisar/calificar entregas. */
export function TasksReview({ week, students }: { week: number; students: Profile[] }) {
  const tasks = useAsync(listTasks, []);
  const subs = useAsync(() => listSubmissions(), []);
  const act = useAction();
  const [f, setF] = useState({ title: "", description: "", closes_at: "" });
  const [grade, setGrade] = useState<Record<string, { g: number; c: string }>>({});
  if (tasks.loading || subs.loading || tasks.error) return <Loading state={{ loading: tasks.loading || subs.loading, error: tasks.error ?? subs.error }} />;
  const name = new Map(students.map((s) => [s.id, s.display_name]));
  const mine = (tasks.data ?? []).filter((t) => t.week === week);
  async function open(s: { url: string | null; storage_path: string | null }) {
    window.open(s.url ?? (await signedUrl("entregas", s.storage_path!)), "_blank", "noopener");
  }
  return (
    <section className="pn-section">
      <h2>Tareas de la lección</h2>
      <p>Los estudiantes pueden entregar desde el inicio de la clase hasta el inicio de la próxima. Después se cierra la recepción y se conserva lo ya entregado.</p>
      <Msg msg={act.msg} />
      <form className="pn-form" onSubmit={(e) => { e.preventDefault(); act.run(async () => { await createTask({ week, title: f.title, description: f.description || undefined, opens_at: new Date().toISOString(), closes_at: new Date(f.closes_at).toISOString() }); setF({ title: "", description: "", closes_at: "" }); tasks.reload(); }, "Tarea creada."); }}>
        <label>Título<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></label>
        <label>Descripción<input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <label>Cierra (inicio de la próxima clase)<input type="datetime-local" value={f.closes_at} onChange={(e) => setF({ ...f, closes_at: e.target.value })} required /></label>
        <button className="pn-btn" type="submit" disabled={act.busy}>Crear tarea</button>
      </form>
      {mine.length === 0 && <p>Todavía no hay tareas para esta lección.</p>}
      {mine.map((t) => (
        <div className="pn-card" key={t.id} style={{ marginBottom: 12 }}>
          <strong>{t.title}</strong>
          <ul>{(subs.data ?? []).filter((s) => s.assignment_id === t.id).map((s) => (
            <li key={s.id}>{name.get(s.student_id) ?? "Estudiante"} — {s.kind.toLowerCase()} · {new Date(s.submitted_at).toLocaleString("es-DO")} {s.grade != null && <span className="pn-chip ok">{s.grade}/25</span>}
              <div className="pn-inline"><button type="button" className="pn-btn secondary" onClick={() => open(s)}>Abrir / descargar</button>
                <input type="number" min={0} max={25} aria-label="Calificación" placeholder="0–25" style={{ width: 70 }} value={grade[s.id]?.g ?? ""} onChange={(e) => setGrade({ ...grade, [s.id]: { g: +e.target.value, c: grade[s.id]?.c ?? "" } })} />
                <input aria-label="Comentario" placeholder="Comentario" value={grade[s.id]?.c ?? ""} onChange={(e) => setGrade({ ...grade, [s.id]: { g: grade[s.id]?.g ?? 0, c: e.target.value } })} />
                <button type="button" className="pn-btn" disabled={grade[s.id] === undefined || act.busy} onClick={() => act.run(async () => { await gradeSubmission(s.id, grade[s.id].g, grade[s.id].c || undefined); subs.reload(); }, "Calificada.")}>Calificar</button></div></li>
          ))}</ul>
        </div>
      ))}
    </section>
  );
}

/** Actividades de la lección (con evidencia) que el maestro registra por estudiante. NO son las actividades obligatorias del maestro (inicio/fin de clase y pase de lista) ni las de integración. */
export function MandatoryBlock({ week, students }: { week: number; students: Profile[] }) {
  const q = useAsync(listActivities, []);
  const act = useAction();
  if (q.loading || q.error) return <Loading state={q} />;
  const mine = (q.data ?? []).filter((a) => a.week === week);
  return (
    <section className="pn-section">
      <h2>Actividades de la lección</h2>
      <Msg msg={act.msg} />
      {mine.length === 0 ? <p>Esta lección no tiene actividades de este tipo.</p> : mine.map((a) => (
        <div className="pn-card" key={a.id} style={{ marginBottom: 12 }}><strong>{a.title}</strong> <small>({a.points} puntos)</small><br /><small>{a.instructions}</small>
          <div className="pn-inline" style={{ marginTop: 8 }}>{students.map((s) => <button key={s.id} type="button" className="pn-btn secondary" disabled={act.busy} onClick={() => act.run(() => markActivityDone(a.id, s.id, a.points), `${s.display_name}: cumplida.`)}>✔ {s.display_name}</button>)}</div></div>
      ))}
    </section>
  );
}

/** Actividad de integración: se asigna a estudiantes en ESTA lección; el maestro de la SIGUIENTE registra quién participó (suma 👑). */
export function IntegrationBlock({ week, students }: { week: number; students: Profile[] }) {
  const q = useAsync(listIntegrationActivities, []);
  const act = useAction();
  if (q.loading || q.error) return <Loading state={q} />;
  const mine = (q.data ?? []).find((a) => a.week === week);
  const prev = (q.data ?? []).find((a) => a.week === week - 1);
  return (
    <section className="pn-section">
      <h2>Actividad de integración</h2>
      <Msg msg={act.msg} />
      <h3>De esta lección {mine && <small>— {mine.title}</small>}</h3>
      {mine ? <><p><small>{mine.instructions}</small></p><div className="pn-inline">{students.map((s) => <button key={s.id} type="button" className="pn-btn secondary" disabled={act.busy} onClick={() => act.run(() => assignIntegration(week, s.id), `Asignada a ${s.display_name}.`)}>Asignar a {s.display_name}</button>)}</div></> : <p>Esta lección no tiene actividad de integración definida.</p>}
      <h3 style={{ marginTop: 16 }}>De la lección anterior {prev && <small>— {prev.title}</small>}</h3>
      {prev ? <><p>Registra quién participó (cada participación suma una corona 👑).</p><div className="pn-inline">{students.map((s) => <button key={s.id} type="button" className="pn-btn" disabled={act.busy} onClick={() => act.run(() => registerParticipation(week - 1, s.id), `👑 ${s.display_name} participó.`)}>👑 {s.display_name}</button>)}</div></> : <p>La lección anterior no tiene actividad de integración.</p>}
    </section>
  );
}

