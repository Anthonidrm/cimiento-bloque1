// Convierte un archivo de public/ en su recurso del almacenamiento privado (misma convención que 0003):
//   recursos/{audiencia}/{semana}/{tipo}/{ranura}/{marca}-{archivo}
export interface PlannedResource { week: number; kind: string; slot: string; title: string; audience: "MAESTRO" | "ESTUDIANTE" | "TODOS"; mime: string; source: string }

const MIME: Record<string, string> = { pdf: "application/pdf", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", jpg: "image/jpeg", png: "image/png" };

export function planResource(relPath: string): PlannedResource | null {
  const ext = relPath.split(".").pop()!.toLowerCase();
  const mime = MIME[ext];
  let m: RegExpMatchArray | null;
  if (!mime) return null;
  if ((m = relPath.match(/^recursos-semana-(\d+)\/presentacion-semana-\d+\.(pdf|pptx)$/)))
    return { week: +m[1], kind: "PRESENTACION", slot: ext, title: `Presentación Semana ${m[1]} (${ext.toUpperCase()})`, audience: "MAESTRO", mime, source: relPath };
  if ((m = relPath.match(/^recursos-semana-(\d+)\/hoja-trabajo-semana-\d+\.pdf$/)))
    return { week: +m[1], kind: "HOJA_TRABAJO", slot: "principal", title: `Hoja de trabajo Semana ${m[1]}`, audience: "TODOS", mime, source: relPath };
  if ((m = relPath.match(/^recursos-semana-(\d+)\/colorear-semana-\d+\.pdf$/)))
    return { week: +m[1], kind: "HOJA_COLOREAR", slot: "principal", title: `Hoja para colorear Semana ${m[1]}`, audience: "TODOS", mime, source: relPath };
  if ((m = relPath.match(/^recursos-semana-(\d+)\/versiculo-semana-\d+\.pdf$/)))
    return { week: +m[1], kind: "TARJETA_VERSICULO", slot: "principal", title: `Tarjeta de versículo Semana ${m[1]}`, audience: "TODOS", mime, source: relPath };
  if ((m = relPath.match(/^guias\/guia-semana-(\d+)\.pdf$/)))
    return { week: +m[1], kind: "GUIA", slot: "principal", title: `Guía del Maestro Semana ${m[1]}`, audience: "MAESTRO", mime, source: relPath };
  if ((m = relPath.match(/^presentaciones\/semana-(\d+)\/slide-(\d+)\.jpg$/)))
    return { week: +m[1], kind: "IMAGEN", slot: `diapositiva-${m[2]}`, title: `Diapositiva ${m[2]} — Semana ${m[1]}`, audience: "MAESTRO", mime, source: relPath };
  return null; // personajes, favicon y PDF heredados: no son recursos de lección
}

export const storagePath = (r: PlannedResource, stamp: number, filename: string) =>
  `${r.audience.toLowerCase()}/${r.week}/${r.kind}/${r.slot}/${stamp}-${filename.replace(/[^\w.-]/g, "_")}`;
