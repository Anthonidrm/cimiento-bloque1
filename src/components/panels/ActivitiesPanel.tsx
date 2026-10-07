import { useState } from "react";
import { listTasks, listActivities, listIntegrationActivities, createMandatoryActivity, saveIntegrationActivity } from "../../backend/students";
import { Msg, Loading } from "./ui";
import { useAsync, useAction, fmtDate } from "./hooks";

/** Actividades de la lección, actividad de integración y tareas. (Las actividades obligatorias DEL MAESTRO son inicio/fin de clase y pase de lista.) `canEdit`: Administrador/Pastor definen (el servidor decide quién puede). */
export function ActivitiesPanel({ canEdit }: { canEdit: boolean }) {
  const mand = useAsync(listActivities, []);
  const integ = useAsync(listIntegrationActivities, []);
  const tasks = useAsync(listTasks, []);
  const act = useAction();
  const [m, setM] = useState({ week: 1, title: "", description: "", instructions: "", materials: "", points: 0, evidence_required: false, due_at: "" });
  const [i, setI] = useState({ week: 1, title: "", description: "", instructions: "", materials: "" });
  if (mand.loading || mand.error) return <Loading state={mand} />;

  return (
    <section className="pn-section">
      <h2>Actividades</h2>
      <Msg msg={act.msg} />
      <h3>Actividades de la lección <small>(no forman parte del 15 % de preparación del maestro)</small></h3>
      {canEdit && (
        <form className="pn-form" onSubmit={(e) => { e.preventDefault(); act.run(async () => { await createMandatoryActivity({ ...m, due_at: m.due_at || undefined }); setM({ ...m, title: "", description: "", instructions: "", materials: "" }); mand.reload(); }, "Actividad creada."); }}>
          <label>Semana<input type="number" min={1} max={52} value={m.week} onChange={(e) => setM({ ...m, week: +e.target.value })} /></label>
          <label>Título<input value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} required /></label>
          <label>Descripción<input value={m.description} onChange={(e) => setM({ ...m, description: e.target.value })} /></label>
          <label>Instrucciones<input value={m.instructions} onChange={(e) => setM({ ...m, instructions: e.target.value })} /></label>
          <label>Materiales<input value={m.materials} onChange={(e) => setM({ ...m, materials: e.target.value })} /></label>
          <label>Puntos (0–25)<input type="number" min={0} max={25} value={m.points} onChange={(e) => setM({ ...m, points: +e.target.value })} /></label>
          <label>Fecha límite<input type="datetime-local" value={m.due_at} onChange={(e) => setM({ ...m, due_at: e.target.value })} /></label>
          <label><span>Exige evidencia</span><input type="checkbox" checked={m.evidence_required} onChange={(e) => setM({ ...m, evidence_required: e.target.checked })} /></label>
          <button className="pn-btn" type="submit" disabled={act.busy}>Crear actividad</button>
        </form>
      )}
      <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Semana</th><th>Título</th><th>Puntos</th><th>Evidencia</th><th>Fecha límite</th></tr></thead><tbody>
        {(mand.data ?? []).length === 0 && <tr><td colSpan={5}>Todavía no hay actividades obligatorias.</td></tr>}
        {(mand.data ?? []).map((a) => <tr key={a.id}><td>{a.week}</td><td>{a.title}<br /><small>{a.instructions}</small></td><td>{a.points}</td><td>{a.evidence_required ? "Sí" : "No"}</td><td>{fmtDate(a.due_at)}</td></tr>)}
      </tbody></table></div>

      <h3 style={{ marginTop: 24 }}>Actividad de integración</h3>
      {canEdit && (
        <form className="pn-form" onSubmit={(e) => { e.preventDefault(); act.run(async () => { await saveIntegrationActivity({ ...i, points: 0, evidence: null }); integ.reload(); }, "Actividad de integración guardada."); }}>
          <label>Semana<input type="number" min={1} max={52} value={i.week} onChange={(e) => setI({ ...i, week: +e.target.value })} /></label>
          <label>Título<input value={i.title} onChange={(e) => setI({ ...i, title: e.target.value })} required /></label>
          <label>Descripción<input value={i.description} onChange={(e) => setI({ ...i, description: e.target.value })} /></label>
          <label>Instrucciones<input value={i.instructions} onChange={(e) => setI({ ...i, instructions: e.target.value })} /></label>
          <label>Materiales<input value={i.materials} onChange={(e) => setI({ ...i, materials: e.target.value })} /></label>
          <button className="pn-btn" type="submit" disabled={act.busy}>Guardar</button>
        </form>
      )}
      <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Semana</th><th>Título</th><th>Instrucciones</th><th>Materiales</th></tr></thead><tbody>
        {(integ.data ?? []).length === 0 && <tr><td colSpan={4}>Todavía no hay actividades de integración definidas.</td></tr>}
        {(integ.data ?? []).map((a) => <tr key={a.week}><td>{a.week}</td><td>{a.title}<br /><small>{a.description}</small></td><td>{a.instructions}</td><td>{a.materials}</td></tr>)}
      </tbody></table></div>

      <h3 style={{ marginTop: 24 }}>Tareas (asignaciones)</h3>
      <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Semana</th><th>Tarea</th><th>Se abre</th><th>Cierra</th></tr></thead><tbody>
        {(tasks.data ?? []).length === 0 && <tr><td colSpan={4}>Todavía no hay tareas.</td></tr>}
        {(tasks.data ?? []).map((t) => <tr key={t.id}><td>{t.week}</td><td>{t.title}</td><td>{fmtDate(t.opens_at)}</td><td>{fmtDate(t.closes_at)}</td></tr>)}
      </tbody></table></div>
    </section>
  );
}
