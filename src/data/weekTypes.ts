// Tipos para el sistema de 52 semanas. Estructura única y definitiva de
// CIMIENTO — no existe un sistema paralelo de 12 lecciones/semanas.

export interface DoctrinalBase {
  textAffirms: string; // Qué afirma directamente el texto bíblico
  legitimateDerivation: string; // Qué enseñanza doctrinal se deriva legítimamente
  applicationForChildren: string; // Qué aplicación corresponde para los niños
  doNotTeach: string; // Qué conceptos NO debemos enseñar a partir de ese texto
  commonErrorsToAvoid: string; // Qué errores doctrinales debe evitar el maestro
}

export type ExamQuestionType =
  | "multiple_choice"
  | "true_false"
  | "comprehension"
  | "scenario"
  | "pedagogical"
  | "doctrinal"
  | "matching";

export interface ExamOption {
  id: string;
  text: string;
}

export interface ExamQuestion {
  id: string;
  type: ExamQuestionType;
  prompt: string;
  options: ExamOption[];
  correctOptionId: string;
  /** Solo para type "matching": pares correctos (izquierda ↔ derecha). `options` queda vacío. */
  pairs?: { left: string; right: string }[];
  explanation: string; // se muestra siempre, en correcto e incorrecto
}

export interface ExternalResource {
  label: string; // p.ej. "Historia adaptada de Súper Libro"
  name: string; // p.ej. "En el principio"
  description: string;
  url: string; // siempre un enlace real y verificado — nunca inventado
}

export interface WeekResource {
  title: string;
  status: "pending" | "available";
  fileUrl?: string;
  secondaryUrl?: string; // p.ej. versión .pptx cuando fileUrl es el PDF
  secondaryLabel?: string;
}

export interface VerseRVR1960 {
  ref: string; // p.ej. "Génesis 1:27"
  text: string; // texto completo, fiel a RVR1960 — nunca truncado
}

export interface WeekGuide {
  // A. Información general
  week: number;
  module: number;
  title: string;
  status: "developed" | "pending";
  ageRange: string;
  objective: string;
  centralTruth: string;
  mainVerses: string;
  fullBibleTextRef: string; // referencia + resumen, no cita extensa textual
  doctrinalConcepts: string[];

  // B. Base doctrinal
  doctrinalBase: DoctrinalBase;

  // C. Guía del maestro
  introduction: string;
  developmentOutline: string;
  biblicalExplanation: string;
  questionsForChildren: string[];
  activity: string;
  dynamic: string;
  practicalApplication: string;
  suggestedPrayer: string;
  materials: string[];
  priorPreparation: string[];
  teacherErrorsToAvoid: string[];
  adaptationYounger: string; // 3–4 años
  adaptationOlder: string; // 8–10 años
  closing: string;

  // D. Examen del maestro
  examQuestions: ExamQuestion[];

  // E. Recursos (4 por semana)
  teacherPresentation: WeekResource; // PowerPoint + PDF — guía de enseñanza que el maestro usa en clase
  studentWorksheet: WeekResource; // PDF, actividades para 5–10 años
  coloringSheet: WeekResource; // PDF, para 3–5 años
  verseCard: WeekResource; // PDF, versículo RVR1960 para llevar a casa
  verseRVR1960: VerseRVR1960;
  externalResources: ExternalResource[]; // historia, canción, recurso doctrinal
}
