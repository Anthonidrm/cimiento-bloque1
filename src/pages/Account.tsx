import { useState, type FormEvent } from "react";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../auth/types";
import { changeOwnPassword, MIN_PASSWORD_LENGTH, passwordChangedAt } from "../auth/authService";
import { backendChangePassword, BACKEND_MIN_PASSWORD } from "../auth/backendAuth";
import "./Course.css";
import "./Auth.css";

export default function Account() {
  const { session, backend, refresh } = useAuth();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session) return null;
  const changedAt = backend ? null : passwordChangedAt(session.userId);
  const minLen = backend ? BACKEND_MIN_PASSWORD : MIN_PASSWORD_LENGTH;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== again) {
      setMsg({ ok: false, text: "La nueva contraseña y su confirmación no coinciden." });
      return;
    }
    setBusy(true);
    const r = backend ? await backendChangePassword(session!.username ?? "", cur, next) : await changeOwnPassword(cur, next);
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: backend ? "Contraseña actualizada." : "Contraseña actualizada en este navegador." });
      if (backend) await refresh();
      setCur("");
      setNext("");
      setAgain("");
    } else {
      setMsg({ ok: false, text: r.error });
    }
  }

  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "Inicio", to: "/" }, { label: "Mi cuenta" }]} />
      <header className="page-header">
        <p className="page-header__eyebrow">{ROLE_LABELS[session.role]}</p>
        <h1>Mi cuenta</h1>
        <p className="page-header__desc">
          Sesión de <strong>{session.displayName}</strong>. Aquí puedes cambiar tu contraseña.
        </p>
      </header>

      {session.mustChangePassword && (
        <p className="pn-msg is-error" role="alert">Es tu primer acceso: define tu contraseña para poder usar CIMIENTO.</p>
      )}
      <form onSubmit={onSubmit} className="auth-form auth-form--wide">
        <label>
          Contraseña actual
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required />
        </label>
        <label>
          Nueva contraseña (mínimo {minLen} caracteres)
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </label>
        <label>
          Repite la nueva contraseña
          <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" required />
        </label>
        {msg && (
          <p className={msg.ok ? "auth-ok" : "auth-error"} role="status">{msg.text}</p>
        )}
        <button type="submit" className="auth-submit" disabled={busy}>
          {busy ? "Guardando…" : "Cambiar contraseña"}
        </button>
        {changedAt && <p className="auth-meta">Último cambio en este navegador: {new Date(changedAt).toLocaleString("es-DO")}</p>}
      </form>

      {backend ? (
        <p className="auth-limit">
          Tu contraseña se guarda de forma segura en el servidor (nunca se muestra ni la ve el Administrador).
        </p>
      ) : (
        <p className="auth-limit">
          Importante: mientras CIMIENTO no tenga servidor, la contraseña cambiada se guarda solo en este
          navegador y dispositivo.
        </p>
      )}
    </div>
  );
}
