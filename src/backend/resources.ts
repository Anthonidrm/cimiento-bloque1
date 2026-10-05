import { getClient, unwrap } from "./client";
import type { NotificationRow, PhotoRow, ResourceRow } from "./types";

export const RESOURCE_KINDS = ["PRESENTACION", "HOJA_TRABAJO", "HOJA_COLOREAR", "TARJETA_VERSICULO", "GUIA", "PDF", "IMAGEN", "VIDEO", "DOCUMENTO", "OTRO"] as const;

export async function listResources(week?: number): Promise<ResourceRow[]> {
  let q = getClient().from("resources").select("id, week, kind, slot, title, audience, resource_versions(id, storage_path, filename, uploaded_at, is_current)").order("week");
  if (week) q = q.eq("week", week);
  const rows = unwrap(await q) as (ResourceRow & { resource_versions: { id: string; storage_path: string; filename: string; uploaded_at: string; is_current: boolean }[] })[];
  return rows.map(({ resource_versions, ...r }) => ({ ...r, current: resource_versions.find((v) => v.is_current) }));
}

const safe = (n: string) => n.replace(/[^\w.-]/g, "_");
/**
 * AGREGA o REEMPLAZA un recurso sin tocar código: un recurso es único por (lección, tipo, ranura).
 * Reemplazar = nueva versión vigente; la anterior se conserva en el historial. Archivo en el bucket privado `recursos`.
 */
export async function putResource(r: { week: number; kind: (typeof RESOURCE_KINDS)[number]; slot?: string; title: string; audience: ResourceRow["audience"]; file: File }) {
  const c = getClient(); const slot = r.slot ?? "principal";
  const found = unwrap(await c.from("resources").select("id").eq("week", r.week).eq("kind", r.kind).eq("slot", slot)) as { id: string }[];
  let id = found[0]?.id;
  if (!id) id = (unwrap(await c.from("resources").insert({ week: r.week, kind: r.kind, slot, title: r.title, audience: r.audience }).select("id").single()) as { id: string }).id;
  else unwrap(await c.from("resources").update({ title: r.title, audience: r.audience }).eq("id", id));
  const path = `${r.audience.toLowerCase()}/${r.week}/${r.kind}/${slot}/${Date.now()}-${safe(r.file.name)}`;
  const up = await c.storage.from("recursos").upload(path, r.file);
  if (up.error) throw new Error(up.error.message);
  unwrap(await c.from("resource_versions").insert({ resource_id: id, storage_path: path, filename: r.file.name, is_current: true }));
  return id;
}
export async function removeResource(id: string) {
  const c = getClient();
  const versions = unwrap(await c.from("resource_versions").select("storage_path").eq("resource_id", id)) as { storage_path: string }[];
  if (versions.length) await c.storage.from("recursos").remove(versions.map((v) => v.storage_path));
  unwrap(await c.from("resources").delete().eq("id", id));
}
export async function resourceVersions(id: string) { return unwrap(await getClient().from("resource_versions").select("*").eq("resource_id", id).order("uploaded_at", { ascending: false })) as { id: string; filename: string; uploaded_at: string; is_current: boolean; storage_path: string }[]; }

// --- Fotos de la clase ---
export async function uploadPhoto(p: { week: number; sessionId?: string; file: File; caption?: string }) {
  const c = getClient();
  const path = `${p.week}/${p.sessionId ?? "sin-clase"}/${Date.now()}-${safe(p.file.name)}`;
  const up = await c.storage.from("fotos").upload(path, p.file);
  if (up.error) throw new Error(up.error.message);
  unwrap(await c.from("class_photos").insert({ week: p.week, session_id: p.sessionId ?? null, storage_path: path, caption: p.caption ?? null }));
}
export async function listPhotos(): Promise<PhotoRow[]> {
  const rows = unwrap(await getClient().from("class_photos").select("*").order("uploaded_at", { ascending: false })) as PhotoRow[];
  return Promise.all(rows.map(async (r) => {
    const s = await getClient().storage.from("fotos").createSignedUrl(r.storage_path, 600);
    return { ...r, url: s.data?.signedUrl };
  }));
}

// --- Notificaciones (dentro de la aplicación; correo y WhatsApp quedan para un servicio real) ---
export async function listNotifications(): Promise<NotificationRow[]> { return unwrap(await getClient().from("notifications").select("id, kind, title, body, payload, created_at, read_at").order("created_at", { ascending: false }).limit(100)) as NotificationRow[]; }
export async function markNotificationRead(id: string) { unwrap(await getClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id)); }
