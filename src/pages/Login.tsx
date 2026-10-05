import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { landingFor } from "../auth/landing";
import { ChildBoy, ChildGirl } from "../components/characters";
import "./Course.css";
import "./Auth.css";

export default function Login() {
  const { session, login } = useAuth();
  const [params] = useSearchParams();
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;

  if (session) {
    return <Navigate to={safeNext ?? landingFor(session.role)} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await login(user, pw);
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "No se pudo iniciar sesión.");
      setPw("");
      return;
    }
    // La redirección la hace el <Navigate> de arriba al actualizarse la sesión.
  }

  return (
    <div className="container page auth-page">
      <div className="auth-card">
        <div className="auth-card__chars" aria-hidden="true">
          <ChildGirl size={110} pose="wave" />
          <ChildBoy size={110} pose="cheer" />
        </div>
        <h1>Iniciar sesión</h1>
        <p className="auth-card__hint">Accede a tu área de CIMIENTO.</p>
        <form onSubmit={onSubmit} className="auth-form" autoComplete="on">
          <label>
            Usuario
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? "Verificando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
