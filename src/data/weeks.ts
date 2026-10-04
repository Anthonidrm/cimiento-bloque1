import type { WeekGuide } from "./weekTypes";
import { getModuleForWeek, modules } from "./modules";
import { week01 } from "./weeks/week01";
import { week02 } from "./weeks/week02";
import { week03 } from "./weeks/week03";
import { week04 } from "./weeks/week04";

const developedWeeks: Record<number, WeekGuide> = {
  1: week01,
  2: week02,
  3: week03,
  4: week04,
};

function pendingWeek(week: number): WeekGuide {
  const mod = getModuleForWeek(week);
  return {
    week,
    module: mod?.id ?? 0,
    title: "",
    status: "pending",
    ageRange: "3–10 años",
    objective: "",
    centralTruth: "",
    mainVerses: "",
    fullBibleTextRef: "",
    doctrinalConcepts: [],
    doctrinalBase: {
      textAffirms: "",
      legitimateDerivation: "",
      applicationForChildren: "",
      doNotTeach: "",
      commonErrorsToAvoid: "",
    },
    introduction: "",
    developmentOutline: "",
    biblicalExplanation: "",
    questionsForChildren: [],
    activity: "",
    dynamic: "",
    practicalApplication: "",
    suggestedPrayer: "",
    materials: [],
    priorPreparation: [],
    teacherErrorsToAvoid: [],
    adaptationYounger: "",
    adaptationOlder: "",
    closing: "",
    examQuestions: [],
    teacherPresentation: { title: `Presentación del maestro — Semana ${week}`, status: "pending" },
    studentWorksheet: { title: `Hoja de trabajo del estudiante (5–10 años) — Semana ${week}`, status: "pending" },
    coloringSheet: { title: `Hoja para colorear (3–5 años) — Semana ${week}`, status: "pending" },
    verseCard: { title: `Versículo para llevar a casa — Semana ${week}`, status: "pending" },
    verseRVR1960: { ref: "", text: "" },
    externalResources: [],
  };
}

export const weeks: WeekGuide[] = Array.from({ length: 52 }, (_, i) => {
  const week = i + 1;
  return developedWeeks[week] ?? pendingWeek(week);
});

export function getWeek(week: number): WeekGuide | undefined {
  return weeks.find((w) => w.week === week);
}

export { modules };
