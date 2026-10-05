import type { ReactNode } from "react";
import { isBackendConfigured } from "../../backend/config";
import "./panels.css";

export function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={`pn-msg ${msg.ok ? "is-ok" : "is-error"}`} role={msg.ok ? "status" : "alert"}>{msg.text}</p>;
}

/** Muestra su contenido solo si hay backend; si no, explica qué falta (no se simula con localStorage). */
export function BackendGate({ children, what }: { children: ReactNode; what?: string }) {
  if (isBackendConfigured()) return <>{children}</>;
  return (
    <div className="pn-gate" role="note">
      <strong>{what ?? "Esta función"} requiere el servidor (Supabase), que todavía no está configurado.</strong>
      <p>
        Define <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (ver README). Mientras tanto no se simula con datos del navegador:
        la información compartida entre usuarios solo puede vivir en el servidor.
      </p>
    </div>
  );
}

export function Loading({ state }: { state: { loading: boolean; error: string | null } }) {
  if (state.error) return <p className="pn-msg is-error" role="alert">{state.error}</p>;
  if (state.loading) return <p className="pn-loading" role="status">Cargando…</p>;
  return null;
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="pn-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={active === t.id} className={active === t.id ? "is-active" : ""} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
