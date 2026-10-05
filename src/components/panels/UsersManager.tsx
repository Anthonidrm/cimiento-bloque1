import { useState } from "react";
import { listProfiles, adminCreateUser, adminUpdateUser, adminResetPassword, adminRemoveAccess, listGroups, createGroup, enrollStudent, unenrollStudent, listEnrollments, addGroupTeacher, removeGroupTeacher, listGroupTeachers } from "../../backend/people";
import type { Role } from "../../backend/types";
import { ROLE_LABELS } from "../../auth/types";
import { Msg, Loading } from "./ui";
import { useAsync, useAction } from "./hooks";

const ROLES: Role[] = ["ADMINISTRADOR", "PASTOR", "MAESTRO", "ESTUDIANTE"];

/** USUARIOS / MAESTROS / ESTUDIANTES (solo Administrador). Crear, cambiar rol, activar/desactivar, restablecer contraseña, quitar acceso. */
export function UsersManager({ only }: { only?: Role }) {
  const q = useAsync(() => listProfiles(only), [only]);
  const act = useAction();
  const [form, setForm] = useState({ username: "", displayName: "", role: (only ?? "MAESTRO") as Role, password: "" });
  const [resetFor, setResetFor] = useState<{ id: string; pw: string } | null>(null);
  if (q.loading || q.error) return <Loading state={q} />;
  const title = only === "MAESTRO" ? "Maestros" : only === "ESTUDIANTE" ? "Estudiantes" : "Usuarios";

  return (
    <section className="pn-section">
      <h2>{title}</h2>
      <p>Las contraseñas las guarda Supabase Auth (con hash); aquí nunca se ven. El restablecimiento define una contraseña temporal y obliga a cambiarla en el siguiente acceso.</p>
      <Msg msg={act.msg} />
      <form className="pn-form" onSubmit={(e) => { e.preventDefault(); act.run(async () => { await adminCreateUser(form); setForm({ ...form, username: "", displayName: "", password: "" }); q.reload(); }, "Usuario creado. Deberá definir su contraseña al entrar."); }}>
        <label>Usuario<input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required minLength={3} autoCapitalize="none" /></label>
        <label>Nombre<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required /></label>
        <label>Rol<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} disabled={!!only}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
        <label>Contraseña temporal (mín. 8)<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" /></label>
        <button type="submit" className="pn-btn" disabled={act.busy}>Crear usuario</button>
      </form>
      <div className="pn-table-wrap">
        <table className="pn-table">
          <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Acceso</th><th>Acciones</th></tr></thead>
          <tbody>
            {(q.data ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.display_name}{u.must_change_password && <><br /><small>Debe definir su contraseña</small></>}</td>
                <td>{u.username}</td>
                <td><select aria-label={`Rol de ${u.display_name}`} value={u.role} onChange={(e) => act.run(async () => { await adminUpdateUser(u.id, { role: e.target.value as Role }); q.reload(); }, "Rol actualizado.")}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></td>
                <td><span className={`pn-chip ${u.active ? "ok" : "bad"}`}>{u.active ? "Activo" : "Desactivado"}</span></td>
                <td>
                  <div className="pn-inline">
                    <button type="button" className="pn-btn secondary" onClick={() => act.run(async () => { await adminUpdateUser(u.id, { active: !u.active }); q.reload(); }, u.active ? "Acceso desactivado." : "Acceso activado.")}>{u.active ? "Desactivar" : "Activar"}</button>
                    {resetFor?.id === u.id ? (
                      <>
                        <input type="password" aria-label="Contraseña temporal" placeholder="Temporal (mín. 8)" value={resetFor.pw} onChange={(e) => setResetFor({ id: u.id, pw: e.target.value })} />
                        <button type="button" className="pn-btn" disabled={resetFor.pw.length < 8} onClick={() => act.run(async () => { await adminResetPassword(u.id, resetFor.pw); setResetFor(null); q.reload(); }, "Contraseña restablecida.")}>Aplicar</button>
                      </>
                    ) : <button type="button" className="pn-btn secondary" onClick={() => setResetFor({ id: u.id, pw: "" })}>Restablecer contraseña</button>}
                    <button type="button" className="pn-btn danger" onClick={() => { if (confirm(`¿Quitar el acceso a ${u.display_name}? Sus datos se conservan.`)) act.run(async () => { await adminRemoveAccess(u.id); q.reload(); }, "Acceso quitado."); }}>Quitar acceso</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Grupos de estudiantes, sus estudiantes y sus maestros (determina "estudiantes asignados" de cada maestro). */
export function GroupsManager() {
  const groups = useAsync(listGroups, []);
  const students = useAsync(() => listProfiles("ESTUDIANTE"), []);
  const teachers = useAsync(() => listProfiles("MAESTRO"), []);
  const enr = useAsync(listEnrollments, []);
  const gt = useAsync(listGroupTeachers, []);
  const act = useAction();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  if (groups.loading || groups.error) return <Loading state={groups} />;
  const inEnr = (s: string, g: string) => (enr.data ?? []).some((e) => e.student_id === s && e.group_id === g);
  const inGt = (t: string, g: string) => (gt.data ?? []).some((e) => e.teacher_id === t && e.group_id === g);

  return (
    <section className="pn-section">
      <h2>Grupos de clase</h2>
      <p>Cada grupo tiene sus estudiantes y sus maestros. Un maestro solo ve a los estudiantes de sus grupos.</p>
      <Msg msg={act.msg} />
      <form className="pn-form" onSubmit={(e) => { e.preventDefault(); act.run(async () => { await createGroup(name, age || undefined); setName(""); setAge(""); groups.reload(); }, "Grupo creado."); }}>
        <label>Nombre del grupo<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        <label>Edades (opcional)<input value={age} onChange={(e) => setAge(e.target.value)} placeholder="3–5 años" /></label>
        <button className="pn-btn" type="submit" disabled={act.busy}>Crear grupo</button>
      </form>
      <div className="pn-cards">
        {(groups.data ?? []).map((g) => (
          <div className="pn-card" key={g.id}>
            <strong>{g.name}</strong> {g.age_range && <small>({g.age_range})</small>}
            <p><small>Maestros</small></p>
            {(teachers.data ?? []).map((t) => <label key={t.id} style={{ display: "block" }}><input type="checkbox" checked={inGt(t.id, g.id)} onChange={(e) => act.run(async () => { await (e.target.checked ? addGroupTeacher(g.id, t.id) : removeGroupTeacher(g.id, t.id)); gt.reload(); }, "Maestros del grupo actualizados.")} /> {t.display_name}</label>)}
            <p><small>Estudiantes</small></p>
            {(students.data ?? []).map((s) => <label key={s.id} style={{ display: "block" }}><input type="checkbox" checked={inEnr(s.id, g.id)} onChange={(e) => act.run(async () => { await (e.target.checked ? enrollStudent(s.id, g.id) : unenrollStudent(s.id, g.id)); enr.reload(); }, "Estudiantes del grupo actualizados.")} /> {s.display_name}</label>)}
          </div>
        ))}
      </div>
    </section>
  );
}
