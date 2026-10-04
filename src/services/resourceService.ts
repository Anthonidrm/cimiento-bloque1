// Biblioteca de recursos — construida ÚNICAMENTE a partir del Plan Anual
// (sistema de 52 semanas). No depende del antiguo sistema de 12
// lecciones — esa arquitectura fue retirada.
import { getAllWeeks } from "./weekService";

export type ResourceCategory =
  | "Presentaciones del maestro"
  | "Hojas de trabajo (5–10 años)"
  | "Hojas para colorear (3–5 años)"
  | "Versículos para llevar a casa"
  | "Recursos adicionales";

export interface LibraryResource {
  id: string;
  name: string;
  description: string;
  category: ResourceCategory;
  relatedWeek: number;
  relatedWeekTitle: string;
  url: string;
  secondaryUrl?: string;
  secondaryLabel?: string;
  kind: "pdf" | "pptx" | "link";
}

export const CATEGORIES: ResourceCategory[] = [
  "Presentaciones del maestro",
  "Hojas de trabajo (5–10 años)",
  "Hojas para colorear (3–5 años)",
  "Versículos para llevar a casa",
  "Recursos adicionales",
];

export function getLibrary(): LibraryResource[] {
  const weeks = getAllWeeks().filter((w) => w.status === "developed");
  const resources: LibraryResource[] = [];

  weeks.forEach((w) => {
    if (w.teacherPresentation.status === "available") {
      resources.push({
        id: `presentacion-${w.week}`,
        name: w.teacherPresentation.title,
        description: `Presentación para proyectar en clase durante la Semana ${w.week}.`,
        category: "Presentaciones del maestro",
        relatedWeek: w.week,
        relatedWeekTitle: w.title,
        url: w.teacherPresentation.fileUrl!,
        secondaryUrl: w.teacherPresentation.secondaryUrl,
        secondaryLabel: w.teacherPresentation.secondaryLabel,
        kind: "pdf",
      });
    }
    if (w.studentWorksheet.status === "available") {
      resources.push({
        id: `hoja-${w.week}`,
        name: w.studentWorksheet.title,
        description: `Actividades para completar — Semana ${w.week}.`,
        category: "Hojas de trabajo (5–10 años)",
        relatedWeek: w.week,
        relatedWeekTitle: w.title,
        url: w.studentWorksheet.fileUrl!,
        kind: "pdf",
      });
    }
    if (w.coloringSheet.status === "available") {
      resources.push({
        id: `colorear-${w.week}`,
        name: w.coloringSheet.title,
        description: `Hoja para colorear — Semana ${w.week}.`,
        category: "Hojas para colorear (3–5 años)",
        relatedWeek: w.week,
        relatedWeekTitle: w.title,
        url: w.coloringSheet.fileUrl!,
        kind: "pdf",
      });
    }
    if (w.verseCard.status === "available") {
      resources.push({
        id: `versiculo-${w.week}`,
        name: `${w.verseRVR1960.ref} (RVR1960)`,
        description: `Versículo para llevar a casa — Semana ${w.week}.`,
        category: "Versículos para llevar a casa",
        relatedWeek: w.week,
        relatedWeekTitle: w.title,
        url: w.verseCard.fileUrl!,
        kind: "pdf",
      });
    }
    w.externalResources.forEach((r, i) => {
      resources.push({
        id: `externo-${w.week}-${i}`,
        name: `${r.label}: ${r.name}`,
        description: r.description,
        category: "Recursos adicionales",
        relatedWeek: w.week,
        relatedWeekTitle: w.title,
        url: r.url,
        kind: "link",
      });
    });
  });

  return resources;
}

export function getLibraryByCategory(): Record<ResourceCategory, LibraryResource[]> {
  const all = getLibrary();
  const grouped = Object.fromEntries(
    CATEGORIES.map((c) => [c, [] as LibraryResource[]])
  ) as Record<ResourceCategory, LibraryResource[]>;
  all.forEach((r) => grouped[r.category].push(r));
  return grouped;
}
