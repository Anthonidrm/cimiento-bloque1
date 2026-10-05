import { getClient, unwrap } from "./client";
export interface ChangeRow { id: string; table_name: string; row_key: string | null; action: string; old_data: Record<string, unknown> | null; new_data: Record<string, unknown> | null; done_by: string | null; done_at: string }
/** Historial de cambios (solo lo lee el Administrador y el Pastor). */
export async function listChangeLog(limit = 100): Promise<ChangeRow[]> {
  return unwrap(await getClient().from("change_log").select("*").order("done_at", { ascending: false }).limit(limit)) as ChangeRow[];
}
