import { useState } from "react";
import { cimientoHealth } from "../../backend/health";
import { adminPing } from "../../backend/people";
import { BACKEND_URL, BACKEND_KEY, AUTH_EMAIL_DOMAIN } from "../../backend/config";
import { useAsync, useAction } from "./hooks";
import { Loading, Msg } from "./ui";

function host(u?: string) { try { return u ? new URL(u).host : "—"; } catch { return "URL no válida"; } }

/** DIAGNÓSTICO (Administrador): comprueba la conexión real con Supabase. No muestra claves. */
export default function DiagnosticPanel() {
  const q = useAsync(cimientoHealth, []);
  const act = useAction();
  const [fn, setFn] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <section className="pn-section">
      <h2>Diagnóstico del servidor</h2>
      <p>Comprueba que la aplicación está conectada a un Supabase real y bien configurado. Lo marcado como obligatorio debe estar en ✔.</p>
      <div className="pn-cards">
        <div className="pn-card"><small>Servidor (Supabase)</small><div><strong>{host(BACKEND_URL)}</strong></div><small>{BACKEND_URL ? "URL configurada" : "sin URL: modo local de desarrollo"}</small></div>
        <div className="pn-card"><small>Clave pública (anon)</small><div><strong>{BACKEND_KEY ? "configurada" : "falta"}</strong></div><small>nunca se muestra</small></div>
        <div className="pn-card"><small>Dominio interno de correo</small><div><strong>@{AUTH_EMAIL_DOMAIN}</strong></div><small>debe coincidir con la función admin-users</small></div>
      </div>
      <Loading state={q} />
      {q.data && (
        <>
          <p className={`pn-msg ${q.data.ok ? "is-ok" : "is-error"}`} role="status">{q.data.ok ? "✔ Todo lo obligatorio está correcto." : "✘ Hay comprobaciones obligatorias que fallan: corrígelas antes de usar CIMIENTO con otros usuarios."}</p>
          <div className="pn-table-wrap"><table className="pn-table"><thead><tr><th /><th>Comprobación</th><th>Detalle</th></tr></thead><tbody>
            {q.data.checks.map((c) => (
              <tr key={c.name}><td>{c.ok ? "✔" : c.required ? "✘" : "—"}</td><td>{c.name} {!c.required && <small>(informativo)</small>}</td><td>{c.detail}</td></tr>
            ))}
          </tbody></table></div>
        </>
      )}
      <h3 style={{ marginTop: 20 }}>Función de servidor «admin-users»</h3>
      <p>Necesaria para crear usuarios, cambiar roles, activar/desactivar y restablecer contraseñas.</p>
      <Msg msg={act.msg} />
      <button type="button" className="pn-btn" disabled={act.busy} onClick={() => act.run(async () => {
        const r = await adminPing();
        const same = r.emailDomain === AUTH_EMAIL_DOMAIN;
        setFn({ ok: same, text: same ? `Desplegada y con el mismo dominio (@${r.emailDomain}).` : `Desplegada, pero usa @${r.emailDomain} y la aplicación @${AUTH_EMAIL_DOMAIN}: deben ser iguales.` });
      }, "")}>Probar la función</button>
      {fn && <p className={`pn-msg ${fn.ok ? "is-ok" : "is-error"}`}>{fn.text}</p>}
      <p><small>El envío de correos no se puede verificar desde aquí: requiere un proveedor de correo y la función send-deliveries (ver README).</small></p>
      <button type="button" className="pn-btn secondary" onClick={() => q.reload()}>Volver a comprobar</button>
    </section>
  );
}
