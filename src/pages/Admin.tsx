import { useState, type FormEvent } from "react";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../auth/types";
import { adminResetPassword, listUsers, passwordChangedAt, MIN_PASSWORD_LENGTH } from "../auth/authService";
import "./Course.css";
import "./Auth.css";

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
