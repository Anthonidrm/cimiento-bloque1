import { missingBackendVars } from "../backend/config";

/** Se muestra cuando la aplicación publicada NO tiene servidor configurado: no se ofrece un "modo de prueba" que parezca real. */
export default function SetupRequired() {
  const missing = missingBackendVars();
  return (
    <main className="container page" role="alert">
      <h1>Falta configurar el servidor</h1>
      <p>
        CIMIENTO necesita conectarse a su servidor (Supabase) para que todos los usuarios vean los mismos datos. Esta publicación todavía no tiene la conexión configurada.
      </p>
      <p>
        <strong>Variables que faltan:</strong> {missing.length ? missing.map((m) => <code key={m} style={{ marginRight: 8 }}>{m}</code>) : "ninguna (revisa que el valor sea correcto)"}
      </p>
      <ol>
        <li>En Vercel: <em>Settings → Environment Variables</em>: agrega <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (clave <em>anon</em> pública).</li>
        <li>Vuelve a desplegar (<em>Deployments → Redeploy</em>): las variables se incorporan al construir la aplicación.</li>
      </ol>
      <p>Guía completa: README → «Supabase: puesta en marcha» y «Vercel».</p>
    </main>
  );
}
