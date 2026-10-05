import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { myScores, myCrowns, listTasks, listSubmissions, submitLink, submitFile, listActivities, completeActivity, mySubmittedActivities, listGames } from "../../backend/students";
import { listLessons } from "../../backend/teaching";
import { ResourcesList } from "../panels/ResourcesPanel";
import { NotificationsPanel, PhotosPanel } from "../panels/ExtrasPanels";
import { GameRunner } from "../../games/Games";
import { Tabs, Msg, Loading } from "../panels/ui";
import { useAsync, useAction, fmtDate } from "../panels/hooks";

const TABS = [
  { id: "progreso", label: "Mi progreso" }, { id: "lecciones", label: "Mis lecciones" }, { id: "actividades", label: "Mis actividades" }, { id: "tareas", label: "Mis tareas" },
  { id: "resultados", label: "Mis resultados" }, { id: "coronas", label: "Mis coronas" }, { id: "recursos", label: "Mis recursos" }, { id: "fotos", label: "Fotos" }, { id: "juegos", label: "Juegos" }, { id: "avisos", label: "Avisos" },
];

/** ÁREA DEL ESTUDIANTE. El estudiante solo ve SU información (lo garantiza el servidor, no esta pantalla). */
export default function StudentArea() {
  const [tab, setTab] = useState("progreso");
  return (
    <>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "progreso" && <Progress />}
      {tab === "lecciones" && <Lessons />}
      {tab === "actividades" && <Activities />}
      {tab === "tareas" && <Tasks />}
      {tab === "resultados" && <Results />}
      {tab === "coronas" && <Crowns />}
      {tab === "recursos" && <ResourcesList />}
      {tab === "fotos" && <PhotosPanel canUpload={false} />}
      {tab === "juegos" && <Games />}
      {tab === "avisos" && <NotificationsPanel />}
    </>
  );
}

function Progress() {
  const sc = useAsync(myScores, []);
  const cr = useAsync(myCrowns, []);
  if (sc.loading || sc.error) return <Loading state={sc} />;
  const rows = sc.data ?? [];
  const avg = rows.length ? Math.round(rows.reduce((a, r) => a + r.total, 0) / rows.length) : 0;
  return (
    <section className="pn-section">
      <h2>Mi progreso</h2>
      <div className="pn-cards">
        <div className="pn-card"><small>Lecciones con puntos</small><div className="big">{rows.length}</div></div>
        <div className="pn-card"><small>Promedio</small><div className="big">{avg} / 100</div></div>
        <div className="pn-card"><small>Coronas</small><div className="big">👑 {cr.data?.length ?? 0}</div></div>
      </div>
      {rows.length === 0 && <p>Cuando asistas a tu primera clase empezarás a sumar puntos. ¡Tú puedes!</p>}
    </section>
  );
}

function Lessons() {
  const q = useAsync(listLessons, []);
  if (q.loading || q.error) return <Loading state={q} />;
  const rows = (q.data ?? []).filter((l) => l.developed);
  return (
    <section className="pn-section">
      <h2>Mis lecciones</h2>
      {rows.length === 0 ? <p>Aún no hay lecciones disponibles.</p> : (
        <ul>{rows.map((l) => <li key={l.week}><strong>Semana {l.week}:</strong> {l.title} {l.teacher_name && <small>· Maestro: {l.teacher_name}</small>}</li>)}</ul>
      )}
    </section>
  );
}

function Activities() {
  const a = useAsync(listActivities, []);
  const done = useAsync(mySubmittedActivities, []);
  const act = useAction();
  const [ev, setEv] = useState<Record<string, string>>({});
  if (a.loading || a.error) return <Loading state={a} />;
  return (
    <section className="pn-section">
      <h2>Mis actividades</h2>
      <Msg msg={act.msg} />
      {(a.data ?? []).length === 0 && <p>No hay actividades por ahora.</p>}
      {(a.data ?? []).map((x) => {
        const isDone = (done.data ?? []).includes(x.id);
        return (
          <div className="pn-card" key={x.id} style={{ marginBottom: 10 }}>
            <strong>{x.title}</strong> <small>Semana {x.week} · {x.points} puntos {x.due_at && `· límite ${fmtDate(x.due_at)}`}</small>
            <p>{x.instructions ?? x.description}</p>
            {isDone ? <span className="pn-chip ok">Enviada ✔</span> : (
              <div className="pn-inline">
                {x.evidence_required && <input aria-label="Evidencia (enlace o descripción)" placeholder="Evidencia" value={ev[x.id] ?? ""} onChange={(e) => setEv({ ...ev, [x.id]: e.target.value })} />}
                <button type="button" className="pn-btn" disabled={act.busy || (x.evidence_required && !ev[x.id])} onClick={() => act.run(async () => { await completeActivity(x.id, ev[x.id]); done.reload(); }, "¡Actividad enviada!")}>Ya la hice</button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function Tasks() {
  const { session } = useAuth();
  const t = useAsync(listTasks, []);
  const s = useAsync(() => listSubmissions(), []);
  const act = useAction();
  const [now] = useState(() => Date.now());
  const [link, setLink] = useState<Record<string, string>>({});
  if (t.loading || s.loading || t.error) return <Loading state={{ loading: t.loading || s.loading, error: t.error ?? s.error }} />;
  return (
    <section className="pn-section">
      <h2>Mis tareas</h2>
      <p>SUBIR ACTIVIDAD: puedes entregar un documento, una imagen o un enlace, desde el inicio de la clase hasta el inicio de la próxima. Después se cierra y se conserva lo que entregaste.</p>
      <Msg msg={act.msg} />
      {(t.data ?? []).length === 0 && <p>No hay tareas por ahora.</p>}
      {(t.data ?? []).map((x) => {
        const open = now >= new Date(x.opens_at).getTime() && now < new Date(x.closes_at).getTime();
        const mine = (s.data ?? []).filter((r) => r.assignment_id === x.id);
        return (
          <div className="pn-card" key={x.id} style={{ marginBottom: 12 }}>
            <strong>{x.title}</strong> <span className={`pn-chip ${open ? "ok" : "bad"}`}>{open ? "Abierta" : "Cerrada"}</span><br /><small>Cierra: {fmtDate(x.closes_at)}</small>
            <p>{x.description}</p>
            {mine.map((r) => <p key={r.id}><small>Entregaste {r.kind.toLowerCase()} el {fmtDate(r.submitted_at)}.</small> {r.grade != null && <span className="pn-chip ok">Nota {r.grade}/25</span>} {r.teacher_comment && <em>«{r.teacher_comment}»</em>}</p>)}
            {open && (
              <div className="pn-inline">
                <input aria-label="Enlace" placeholder="https://…" value={link[x.id] ?? ""} onChange={(e) => setLink({ ...link, [x.id]: e.target.value })} />
                <button type="button" className="pn-btn" disabled={!link[x.id] || act.busy} onClick={() => act.run(async () => { await submitLink(x.id, link[x.id]); setLink({ ...link, [x.id]: "" }); s.reload(); }, "¡Enlace entregado!")}>Entregar enlace</button>
                <label className="pn-btn secondary">Subir archivo<input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && session) act.run(async () => { await submitFile(x.id, session.userId, f, f.type.startsWith("image/") ? "IMAGEN" : "DOCUMENTO"); s.reload(); }, "¡Archivo entregado!"); }} /></label>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function Results() {
  const q = useAsync(myScores, []);
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>Mis resultados</h2>
      <p>Cada lección vale 100 puntos: asistencia 25 · asignación 25 · participación 25 · examen 25.</p>
      <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th>Semana</th><th>Asistencia</th><th>Asignación</th><th>Participación</th><th>Examen</th><th>Total</th></tr></thead><tbody>
        {(q.data ?? []).length === 0 && <tr><td colSpan={6}>Todavía no tienes resultados.</td></tr>}
        {(q.data ?? []).map((r) => <tr key={r.week}><td>{r.week}</td><td>{r.attendance_pts}</td><td>{r.submission_pts}</td><td>{r.participation_pts}</td><td>{r.exam_pts}</td><td><strong>{r.total}</strong></td></tr>)}
      </tbody></table></div>
    </section>
  );
}

function Crowns() {
  const q = useAsync(myCrowns, []);
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>Mis coronas</h2>
      <p className="big" style={{ fontSize: "2rem" }}>{"👑".repeat(Math.min(q.data?.length ?? 0, 20)) || "Aún no tienes coronas"} {(q.data?.length ?? 0) > 0 && `(${q.data!.length})`}</p>
      <ul>{(q.data ?? []).map((c) => <li key={c.id}>👑 Semana {c.week} — {fmtDate(c.awarded_at)}</li>)}</ul>
    </section>
  );
}

function Games() {
  const q = useAsync(listGames, []);
  const [play, setPlay] = useState<string | null>(null);
  if (q.loading || q.error) return <Loading state={q} />;
  const games = (q.data ?? []).filter((g) => g.active);
  const cur = games.find((g) => g.id === play);
  return (
    <section className="pn-section">
      <h2>Juegos y pruebas</h2>
      {cur ? <><button type="button" className="pn-btn secondary" onClick={() => setPlay(null)}>← Volver</button><h3>{cur.title}</h3><GameRunner game={cur} /></> : (
        games.length === 0 ? <p>Todavía no hay juegos.</p> : <div className="pn-cards">{games.map((g) => <div className="pn-card" key={g.id}><strong>{g.title}</strong><br /><small>Semana {g.week}{g.counts_as_exam ? " · cuenta para tu examen" : ""}</small><br /><button type="button" className="pn-btn" onClick={() => setPlay(g.id)}>Jugar</button></div>)}</div>
      )}
    </section>
  );
}
