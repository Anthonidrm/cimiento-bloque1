// Porcentaje de preparación del maestro por lección.
// Pesos en src/config/preparationConfig.ts (examen 30 %, presentación 20 %,
// 50 % restante configurable y todavía pendiente de definir).
import { getWeek } from "../data/weeks";
import { getCurrentUserId } from "../auth/session";
import { PREPARATION_CONFIG, resolveWeights } from "../config/preparationConfig";
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
  activitiesPending: boolean;
}

export function computePreparation(week: number, userId: string = getCurrentUserId()): PreparationResult {
  const w = resolveWeights();
  const guide = loadProgress(week, userId);
  const done = completedCount(guide);
  const totalQ = getWeek(week)?.examQuestions.length ?? 0;
  const examDone = isExamComplete(week, totalQ);
  const score = examDone ? getExamScore(week, totalQ) : 0;
  const pres = getPresentationUsage(week, userId);

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
      label: "Actividades obligatorias",
      weight: w.mandatoryActivities,
      earned: 0,
      done: false,
      detail: "Pendiente de definir (próxima fase)",
    },
  ];

  const percent = Math.round(components.reduce((s, c) => s + c.earned, 0));
  return {
    percent,
    components,
    activitiesPending: PREPARATION_CONFIG.mandatoryActivitiesPending,
  };
}

export function getPreparationPercent(week: number, userId?: string): number {
  return computePreparation(week, userId).percent;
}
