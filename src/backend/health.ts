import { getClient, unwrap } from "./client";

export interface HealthCheck { name: string; required: boolean; ok: boolean; detail: string }
export interface HealthReport { ok: boolean; checks: HealthCheck[]; at: string }

/** Diagnóstico del servidor (solo el Administrador): esquema, permisos, almacenamiento, semillas y usuarios. */
export async function cimientoHealth(): Promise<HealthReport> {
  return unwrap(await getClient().rpc("cimiento_health")) as HealthReport;
}
