import { useState, type FormEvent } from "react";
import Breadcrumbs from "../components/Breadcrumbs";
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

export default function Admin() {
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
