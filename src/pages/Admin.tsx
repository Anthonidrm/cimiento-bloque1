import { useState, type FormEvent } from "react";
import Breadcrumbs from "../components/Breadcrumbs";
import { Tabs, BackendGate } from "../components/panels/ui";
import AssignTeachers from "../components/panels/AssignTeachers";
import { TeacherProgressTable, StudentProgressTable } from "../components/panels/ProgressTables";
import { SessionsReports } from "../components/panels/SessionsReports";
import { UsersManager, GroupsManager } from "../components/panels/UsersManager";
import { ResourcesManager } from "../components/panels/ResourcesPanel";
import { ActivitiesPanel } from "../components/panels/ActivitiesPanel";
import { NotificationsPanel, ChangeLogPanel, LessonsTable, PastoralReviewPanel } from "../components/panels/ExtrasPanels";
import DiagnosticPanel from "../components/panels/DiagnosticPanel";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../auth/types";
import AreaSections, { type AreaSection } from "../components/AreaSections";
import { adminResetPassword, listUsers, passwordChangedAt, MIN_PASSWORD_LENGTH } from "../auth/authService";
import "./Course.css";
import "./Auth.css";

const BACKEND = "Necesita compartir información entre usuarios (backend). Ver docs/BACKEND_PROPUESTA.md.";

const SECTIONS: AreaSection[] = [
  { title: "A. Usuarios", description: "Crear, modificar, activar, desactivar, quitar acceso y restablecer contraseñas.", status: "partial", note: "Hoy: lista y restablecimiento solo en este navegador (abajo). Crear, modificar, activar y desactivar requieren backend." },
  { title: "B. Roles", description: "Administrador, Pastor, Maestro y Estudiante, con permisos distintos.", status: "partial", note: "Los 4 roles y sus permisos de pantalla existen. Cambiar el rol de un usuario requiere backend." },
  { title: "C. Asignación de maestros", description: "Asignar maestro por lección, con fecha, hora y control de atraso (4 horas).", status: "backend", note: BACKEND },
  { title: "D. Progreso de maestros", description: "Lecciones asignadas, guía, examen, calificación, presentación y retrasos.", status: "backend", note: "Hoy el progreso se guarda en el navegador de cada maestro." },
  { title: "E. Progreso de estudiantes", description: "Asistencia, asignaciones, actividades, examen, participación y coronas.", status: "backend", note: BACKEND },
  { title: "F. Recursos", description: "Agregar, reemplazar y eliminar recursos de cada lección desde la aplicación.", status: "partial", to: "/recursos", note: "Consulta disponible. Reemplazar archivos sin tocar código requiere almacenamiento (backend)." },
  { title: "G. Lecciones", description: "Plan Anual de 52 semanas; las semanas 1–4 tienen contenido completo.", status: "available", to: "/plan-anual", note: "Las semanas 5–52 esperan la fuente oficial de temas." },
  { title: "H. Actividades", description: "Actividades obligatorias y actividades de integración por lección.", status: "backend", note: BACKEND },
  { title: "I. Configuración", description: "Pesos de preparación, intentos del examen y uso de la presentación.", status: "partial", note: "Se configuran en src/config/*.ts; aún no desde una pantalla." },
];

function LocalAdmin() {
  const { session } = useAuth();
  const users = listUsers();
  const [target, setTarget] = useState(users[0]?.id ?? "");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  const isAdmin = session?.role === "ADMINISTRADOR";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const r = await adminResetPassword(target, pw);
    if (r.ok) {
      setMsg({ ok: true, text: "Contraseña restablecida en este navegador." });
      setPw("");
      setTick((t) => t + 1);
    } else {
      setMsg({ ok: false, text: r.error });
    }
  }

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Administración" }]} />
      <header className="page-header">
        <p className="page-header__eyebrow">Administración educativa</p>
        <h1>Usuarios y roles</h1>
        <p className="page-header__desc">
          Cuentas iniciales de CIMIENTO. Las contraseñas nunca se muestran.
        </p>
      </header>

      <AreaSections sections={SECTIONS} />

      <h2 className="admin-h2">Usuarios (estado actual)</h2>
      <table className="admin-table" key={tick}>
        <thead>
          <tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Contraseña cambiada</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.displayName}</td>
              <td>{ROLE_LABELS[u.role]}</td>
              <td>{passwordChangedAt(u.id) ? "Sí (en este navegador)" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="admin-reset">
        <h2>Restablecer contraseña</h2>
        {isAdmin ? (
          <form onSubmit={onSubmit} className="auth-form auth-form--wide">
            <label>
              Usuario
              <select value={target} onChange={(e) => setTarget(e.target.value)}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.displayName} ({u.id})</option>
                ))}
              </select>
            </label>
            <label>
              Nueva contraseña (mínimo {MIN_PASSWORD_LENGTH} caracteres)
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
            </label>
            {msg && <p className={msg.ok ? "auth-ok" : "auth-error"} role="status">{msg.text}</p>}
            <button type="submit" className="auth-submit">Restablecer</button>
          </form>
        ) : (
          <p>Solo el administrador puede restablecer contraseñas.</p>
        )}
        <p className="auth-limit">
          Limitación actual: sin servidor, un restablecimiento solo afecta a este navegador. Para que
          funcione en todos los dispositivos se necesita el backend (próxima fase).
        </p>
      </section>
    </div>
  );
}

const TABS = [
  { id: "usuarios", label: "Usuarios" }, { id: "maestros", label: "Maestros" }, { id: "estudiantes", label: "Estudiantes" }, { id: "grupos", label: "Grupos" },
  { id: "lecciones", label: "Lecciones" }, { id: "asignaciones", label: "Asignaciones" }, { id: "prog-maestros", label: "Progreso maestros" },
  { id: "prog-estudiantes", label: "Progreso estudiantes" }, { id: "recursos", label: "Recursos" }, { id: "clases", label: "Clases" },
  { id: "actividades", label: "Actividades" }, { id: "reportes", label: "Reportes" }, { id: "historial", label: "Historial de cambios" },
  { id: "revision", label: "Revisión pastoral" }, { id: "notificaciones", label: "Notificaciones" }, { id: "diagnostico", label: "Diagnóstico" },
];

/** Administración (solo Administrador). Con backend: panel completo; sin backend: vista local y qué falta. */
export default function Admin() {
  const { backend } = useAuth();
  const [tab, setTab] = useState("usuarios");
  if (!backend) {
    return (
      <>
        <div className="container page"><BackendGate what="La administración completa (usuarios, asignaciones, progreso, recursos, clases)">{null}</BackendGate></div>
        <LocalAdmin />
      </>
    );
  }
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Administración" }]} />
      <header className="page-header">
        <p className="page-header__eyebrow">Administración</p>
        <h1>Panel del Administrador</h1>
        <p className="page-header__desc">Acceso completo: usuarios, roles, maestros, estudiantes, lecciones, asignaciones, progreso, recursos, clases, actividades y reportes.</p>
      </header>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "usuarios" && <UsersManager />}
      {tab === "maestros" && <UsersManager only="MAESTRO" />}
      {tab === "estudiantes" && <UsersManager only="ESTUDIANTE" />}
      {tab === "grupos" && <GroupsManager />}
      {tab === "lecciones" && <LessonsTable />}
      {tab === "asignaciones" && <AssignTeachers />}
      {tab === "prog-maestros" && <TeacherProgressTable />}
      {tab === "prog-estudiantes" && <StudentProgressTable />}
      {tab === "recursos" && <ResourcesManager />}
      {tab === "clases" && <SessionsReports mode="clases" />}
      {tab === "actividades" && <ActivitiesPanel canEdit />}
      {tab === "reportes" && <SessionsReports mode="informes" />}
      {tab === "historial" && <ChangeLogPanel />}
      {tab === "revision" && <PastoralReviewPanel />}
      {tab === "notificaciones" && <NotificationsPanel />}
      {tab === "diagnostico" && <DiagnosticPanel />}
    </div>
  );
}
