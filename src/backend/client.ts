import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BACKEND_KEY, BACKEND_URL, forceBackendConfigured } from "./config";

let client: SupabaseClient | null = null;

/** ¿Hay un backend configurado? (variables de entorno, o un cliente inyectado en pruebas) */
export function backendConfigured(): boolean {
  return client !== null || Boolean(BACKEND_URL && BACKEND_KEY);
}

export function getClient(): SupabaseClient {
  if (!client) {
    if (!BACKEND_URL || !BACKEND_KEY) throw new Error("Backend no configurado: definir VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
    client = createClient(BACKEND_URL, BACKEND_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

/** Solo para pruebas: inyecta un cliente ya construido (p. ej. contra el entorno local). */
export function setClientForTests(c: SupabaseClient | null) {
  client = c;
  forceBackendConfigured(c !== null);
}

/** Desenvuelve una respuesta de Supabase: devuelve los datos o lanza un Error con el mensaje del servidor. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
