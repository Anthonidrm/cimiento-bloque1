import { useState } from "react";
import { listNotifications, markNotificationRead, uploadPhoto, listPhotos } from "../../backend/resources";
import { listChangeLog } from "../../backend/audit";
import { listLessons } from "../../backend/teaching";
import { weeks } from "../../data/weeks";
import { Msg, Loading } from "./ui";
import { useAsync, useAction, fmtDate } from "./hooks";

/** Notificaciones dentro de la aplicación. Correo y WhatsApp no se simulan: ver docs/BACKEND_PROPUESTA.md. */
export function NotificationsPanel() {
  const q = useAsync(listNotifications, []);
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>Notificaciones</h2>
      {(q.data ?? []).length === 0 ? <p>No tienes notificaciones.</p> : (
        <ul>{(q.data ?? []).map((n) => (
          <li key={n.id} style={{ opacity: n.read_at ? 0.6 : 1 }}>
            <strong>{n.title}</strong> <small>{fmtDate(n.created_at)}</small><br />{n.body}
            {!n.read_at && <> <button type="button" className="pn-btn secondary" onClick={async () => { await markNotificationRead(n.id); q.reload(); }}>Marcar como leída</button></>}
          </li>
        ))}</ul>
      )}
    </section>
  );
}

/** FOTOS DE LA CLASE: suben maestro, Pastor y Administrador; el estudiante ve las de su grupo (lo decide el servidor). */
export function PhotosPanel({ canUpload, week, sessionId }: { canUpload: boolean; week?: number; sessionId?: string }) {
  const q = useAsync(listPhotos, []);
  const act = useAction();
  const [w, setW] = useState(week ?? 1);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>Fotos de las clases</h2>
      <Msg msg={act.msg} />
      {canUpload && (
        <form className="pn-form" onSubmit={(e) => { e.preventDefault(); if (!file) return; act.run(async () => { await uploadPhoto({ week: w, sessionId, file, caption: caption || undefined }); setFile(null); setCaption(""); q.reload(); }, "Foto subida."); }}>
          {week === undefined && <label>Semana<input type="number" min={1} max={52} value={w} onChange={(e) => setW(+e.target.value)} /></label>}
          <label>Foto<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></label>
          <label>Descripción<input value={caption} onChange={(e) => setCaption(e.target.value)} /></label>
          <button className="pn-btn" type="submit" disabled={act.busy || !file}>Subir foto</button>
        </form>
      )}
      {(q.data ?? []).length === 0 ? <p>No hay fotos todavía.</p> : (
        <div className="pn-cards">{(q.data ?? []).filter((p) => week === undefined || p.week === week).map((p) => (
          <figure className="pn-card" key={p.id} style={{ margin: 0 }}>{p.url && <img src={p.url} alt={p.caption ?? `Foto de la semana ${p.week}`} style={{ width: "100%", borderRadius: 8 }} />}<figcaption><small>Semana {p.week} · {fmtDate(p.uploaded_at)}</small><br />{p.caption}</figcaption></figure>
        ))}</div>
      )}
    </section>
  );
}

/** Historial de cambios (quién cambió qué y cuándo). */
export function ChangeLogPanel() {
  const q = useAsync(() => listChangeLog(100), []);
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>Historial de cambios</h2>
      <p>Cambios en usuarios, recursos, tareas, actividades y configuración. Solo lectura.</p>
      <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Fecha</th><th>Tabla</th><th>Acción</th><th>Registro</th></tr></thead><tbody>
        {(q.data ?? []).length === 0 && <tr><td colSpan={4}>Sin cambios registrados.</td></tr>}
        {(q.data ?? []).map((c) => <tr key={c.id}><td>{fmtDate(c.done_at)}</td><td>{c.table_name}</td><td>{c.action}</td><td><small>{c.row_key}</small></td></tr>)}
      </tbody></table></div>
    </section>
  );
}

/** Lecciones y su maestro asignado (lectura). */
export function LessonsTable() {
  const q = useAsync(listLessons, []);
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>Lecciones</h2>
      <p>52 semanas · 12 módulos. Las semanas 5–52 esperan la fuente oficial de temas; no se inventa contenido.</p>
      <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Semana</th><th>Módulo</th><th>Lección</th><th>Contenido</th><th>Maestro asignado</th></tr></thead><tbody>
        {(q.data ?? []).map((l) => <tr key={l.week}><td>{l.week}</td><td>{l.module_id} — {l.module_title}</td><td>{l.title ?? <em>Tema pendiente</em>}</td><td><span className={`pn-chip ${l.developed ? "ok" : ""}`}>{l.developed ? "Desarrollada" : "Pendiente"}</span></td><td>{l.teacher_name ?? "Sin asignar"}</td></tr>)}
      </tbody></table></div>
    </section>
  );
}

/** Preguntas del examen marcadas "Pendiente de revisión pastoral" (datos de la propia app). */
export function PastoralReviewPanel() {
  const items = weeks.filter((w) => w.status === "developed").flatMap((w) => w.examQuestions.filter((q) => q.needsPastoralReview).map((q) => ({ week: w.week, title: w.title, q })));
  return (
    <section className="pn-section">
      <h2>Pendiente de revisión pastoral</h2>
      <p>Preguntas del examen del maestro cuyos pares de relación se tomaron literalmente de la base doctrinal de cada semana. Deben ser revisadas por el Pastor antes de darlas por definitivas.</p>
      <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Semana</th><th>Pregunta</th><th>Pares (elemento → significado)</th></tr></thead><tbody>
        {items.length === 0 && <tr><td colSpan={3}>No hay preguntas pendientes de revisión.</td></tr>}
        {items.map(({ week, title, q }) => <tr key={q.id}><td>{week} — {title}<br /><span className="pn-review-tag">Pendiente de revisión pastoral</span></td><td>{q.prompt}<br /><small>{q.id}</small></td><td><ul style={{ margin: 0, paddingLeft: 16 }}>{(q.pairs ?? []).map((p) => <li key={p.left}><strong>{p.left}</strong> → {p.right}</li>)}</ul></td></tr>)}
      </tbody></table></div>
    </section>
  );
}
