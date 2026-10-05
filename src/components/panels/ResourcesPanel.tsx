import { useState } from "react";
import { listResources, putResource, removeResource, resourceVersions, RESOURCE_KINDS } from "../../backend/resources";
import { signedUrl } from "../../backend/students";
import type { ResourceRow } from "../../backend/types";
import { Msg, Loading } from "./ui";
import { useAsync, useAction, fmtDate } from "./hooks";

const KIND_LABEL: Record<string, string> = { PRESENTACION: "Presentación", HOJA_TRABAJO: "Hoja de trabajo", HOJA_COLOREAR: "Hoja para colorear", TARJETA_VERSICULO: "Tarjeta de versículo", GUIA: "Guía", PDF: "PDF", IMAGEN: "Imagen", VIDEO: "Video", DOCUMENTO: "Documento", OTRO: "Otro" };

async function openFile(path: string) { window.open(await signedUrl("recursos", path), "_blank", "noopener"); }

/** Lectura de los recursos que el usuario puede ver (los archivos viven en el bucket PRIVADO; se abren con URL firmada temporal). */
export function ResourcesList({ week }: { week?: number }) {
  const q = useAsync(() => listResources(week), [week]);
  const act = useAction();
  if (q.loading || q.error) return <Loading state={q} />;
  return (
    <section className="pn-section">
      <h2>Recursos</h2>
      <Msg msg={act.msg} />
      {(q.data ?? []).length === 0 ? <p>No hay recursos disponibles todavía.</p> : (
        <ul>{(q.data ?? []).filter((r) => r.kind !== "IMAGEN").map((r) => <li key={r.id}>Semana {r.week} · {KIND_LABEL[r.kind] ?? r.kind}: {r.title} {r.current && <button type="button" className="pn-btn secondary" onClick={() => act.run(() => openFile(r.current!.storage_path), "")}>Abrir</button>}</li>)}</ul>
      )}
    </section>
  );
}

/** AGREGAR / REEMPLAZAR / ELIMINAR recursos (Administrador y Pastor) sin tocar código. Reemplazar conserva el historial. */
export function ResourcesManager() {
  const q = useAsync(() => listResources(), []);
  const act = useAction();
  const [form, setForm] = useState({ week: 1, kind: "PRESENTACION" as (typeof RESOURCE_KINDS)[number], slot: "principal", title: "", audience: "TODOS" as ResourceRow["audience"] });
  const [file, setFile] = useState<File | null>(null);
  const [hist, setHist] = useState<{ id: string; rows: Awaited<ReturnType<typeof resourceVersions>> } | null>(null);
  if (q.loading || q.error) return <Loading state={q} />;
  const rows = (q.data ?? []).filter((r) => r.kind !== "IMAGEN");

  return (
    <section className="pn-section">
      <h2>Recursos de las lecciones</h2>
      <p>Un recurso es único por lección, tipo y ranura: agregar uno que ya existe lo <strong>reemplaza</strong> (la versión anterior queda en el historial). Los archivos se guardan en almacenamiento privado.</p>
      <Msg msg={act.msg} />
      <form className="pn-form" onSubmit={(e) => { e.preventDefault(); if (!file) return; act.run(async () => { await putResource({ ...form, file }); setFile(null); q.reload(); }, "Recurso guardado."); }}>
        <label>Semana<input type="number" min={1} max={52} value={form.week} onChange={(e) => setForm({ ...form, week: +e.target.value })} /></label>
        <label>Tipo<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })}>{RESOURCE_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label>
        <label>Ranura<input value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value || "principal" })} /></label>
        <label>Título<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label>Visible para<select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as ResourceRow["audience"] })}><option value="TODOS">Maestros y estudiantes</option><option value="MAESTRO">Solo maestros</option><option value="ESTUDIANTE">Solo estudiantes</option></select></label>
        <label>Archivo<input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></label>
        <button className="pn-btn" type="submit" disabled={act.busy || !file}>Agregar / reemplazar</button>
      </form>
      <div className="pn-table-wrap">
        <table className="pn-table">
          <thead><tr><th>Semana</th><th>Tipo</th><th>Título</th><th>Visible para</th><th>Archivo vigente</th><th>Acciones</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6}>No hay recursos cargados. Usa el formulario o la herramienta de migración (tools/backend/subir_recursos.ts).</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.week}</td><td>{KIND_LABEL[r.kind] ?? r.kind}{r.slot !== "principal" && <small> ({r.slot})</small>}</td><td>{r.title}</td><td>{r.audience}</td>
                <td>{r.current ? <>{r.current.filename}<br /><small>{fmtDate(r.current.uploaded_at)}</small></> : "—"}</td>
                <td><div className="pn-inline">
                  {r.current && <button type="button" className="pn-btn secondary" onClick={() => act.run(() => openFile(r.current!.storage_path), "")}>Abrir</button>}
                  <button type="button" className="pn-btn secondary" onClick={async () => setHist({ id: r.id, rows: await resourceVersions(r.id) })}>Historial</button>
                  <button type="button" className="pn-btn danger" onClick={() => { if (confirm("¿Eliminar este recurso y todas sus versiones?")) act.run(async () => { await removeResource(r.id); q.reload(); }, "Recurso eliminado."); }}>Eliminar</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hist && <div className="pn-card" style={{ marginTop: 12 }}><strong>Versiones</strong><ul>{hist.rows.map((v) => <li key={v.id}>{fmtDate(v.uploaded_at)} — {v.filename} {v.is_current && <span className="pn-chip ok">vigente</span>}</li>)}</ul></div>}
    </section>
  );
}
