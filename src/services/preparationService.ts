// Porcentaje de preparación del maestro por lección.
// Pesos en src/config/preparationConfig.ts: guía 45 % · examen 25 % · presentación 15 % · actividades obligatorias del maestro 15 %
// (inicio y finalización de clase + pase de lista). Suman exactamente 100.
import { getWeek } from "../data/weeks";
import { getCurrentUserId } from "../auth/session";
import { resolveWeights, MANDATORY_SPLIT } from "../config/preparationConfig";
import { getTeacherDuties } from "./mandatoryService";
import { getPresentationUsage } from "./presentationService";
import { GUIDE_SECTION_COUNT } from "../data/guideSections";
import { completedCount, loadProgress } from "./guidePrepService";
import { getExamScore, isExamComplete } from "./examService";

export interface PreparationComponent {
  key: "guide" | "exam" | "presentation" | "mandatoryActivities";
  label: string;
  weight: number; // puntos máximos
  earned: number; // puntos obtenidos
  done: boolean;
  detail: string;
}

export interface PreparationResult {
  percent: number;
  components: PreparationComponent[];
}

export function computePreparation(week: number, userId: string = getCurrentUserId()): PreparationResult {
  const w = resolveWeights();
  const guide = loadProgress(week, userId);
  const done = completedCount(guide);
  const totalQ = getWeek(week)?.examQuestions.length ?? 0;
  const examDone = isExamComplete(week, totalQ);
  const score = examDone ? getExamScore(week, totalQ) : 0;
  const pres = getPresentationUsage(week, userId);
  const duties = getTeacherDuties(week, userId);

  const components: PreparationComponent[] = [
    {
      key: "guide",
      label: "Preparación con la guía",
      weight: w.guide,
      earned: (done / GUIDE_SECTION_COUNT) * w.guide,
      done: done === GUIDE_SECTION_COUNT,
      detail: `${done} de ${GUIDE_SECTION_COUNT} apartados completados`,
    },
    {
      key: "exam",
      label: "Examen del maestro",
      weight: w.exam,
      earned: examDone ? (score / 100) * w.exam : 0,
      done: examDone,
      detail: examDone ? `Puntuación actual: ${score}%` : "Aún no completado",
    },
    {
      key: "presentation",
      label: "Uso de la presentación",
      weight: w.presentation,
      earned: pres.fraction * w.presentation,
      done: pres.slidesUsed === pres.total,
      detail: `${pres.slidesUsed} de ${pres.total} diapositivas proyectadas`,
    },
    {
      key: "mandatoryActivities",
      label: "Actividades obligatorias del maestro",
      weight: w.mandatoryActivities,
      earned:
        (duties.classDone ? (w.mandatoryActivities * MANDATORY_SPLIT.class) / 100 : 0) +
        (duties.attendanceDone ? (w.mandatoryActivities * MANDATORY_SPLIT.attendance) / 100 : 0),
      done: duties.classDone && duties.attendanceDone,
      detail: `Inicio y finalización de clase: ${duties.classDone ? "hecho" : "pendiente"} · Pase de lista: ${duties.attendanceDone ? "hecho" : "pendiente"}`,
    },
  ];

  const percent = Math.round(components.reduce((s, c) => s + c.earned, 0));
  return { percent, components };
}

export function getPreparationPercent(week: number, userId?: string): number {
  return computePreparation(week, userId).percent;
}
