// Construye los 23 apartados de la Guía del Maestro a partir de los datos
// reales de cada semana. Es la ÚNICA fuente de verdad: la guía interactiva,
// la versión imprimible y el PDF descargable salen de aquí.
import type { WeekGuide } from "./weekTypes";
import { modules } from "./modules";
import { AGE_BASE, getGuideExtras } from "./guideExtras";

export type GuideBlock =
  | { t: "p"; text: string }
  | { t: "h"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "kv"; pairs: [string, string][] }
  | { t: "quote"; text: string; cite?: string }
  | { t: "note"; text: string }
  | { t: "links"; links: { label: string; href: string }[] };

export interface GuideSection {
  number: number;
  key: string;
  title: string;
  blocks: GuideBlock[];
}

export const GUIDE_SECTION_TITLES: string[] = [
  "Título",
  "Edad",
  "Objetivo",
  "Duración sugerida",
  "Verdad central",
  "Texto bíblico",
  "Versículo clave",
  "Objetivo de aprendizaje",
  "Base doctrinal",
  "Introducción",
  "Desarrollo de la enseñanza",
  "Preguntas para los niños",
  "Explicación del texto",
  "Aplicación",
  "Dinámica / actividad",
  "Materiales",
  "Transición",
  "Cierre",
  "Oración sugerida",
  "Indicaciones para utilizar el PowerPoint",
  "Indicaciones para utilizar la hoja de trabajo",
  "Indicaciones para utilizar el versículo para llevar a casa",
  "Adaptación para niños de diferentes edades",
];

export const GUIDE_SECTION_COUNT = GUIDE_SECTION_TITLES.length;

/** "1) algo 2) otro" → ["algo", "otro"] */
function splitNumbered(text: string): string[] {
  const parts = text.split(/\s*\d+\)\s*/).map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts : [text];
}

export function buildGuideSections(w: WeekGuide): GuideSection[] {
  const extras = getGuideExtras(w.week);
  const mod = modules.find((m) => m.id === w.module);
  const pending = "Contenido por redactar para esta semana.";
  const ex = extras;

  const bodies: GuideBlock[][] = [
    // 1 Título
    [
      { t: "p", text: w.title },
      { t: "p", text: `Semana ${w.week} · Módulo ${w.module}${mod ? ` — ${mod.title}` : ""}` },
    ],
    // 2 Edad
    [{ t: "p", text: w.ageRange }],
    // 3 Objetivo
    [{ t: "p", text: w.objective }],
    // 4 Duración
    [
      { t: "p", text: "60 minutos, distribuidos así:" },
      {
        t: "ul",
        items: [
          "Bienvenida — 5 min",
          "Reverencia y oración — 5 min",
          "Enseñanza bíblica — 20 min",
          "Dinámica — 10 min",
          "Aplicación — 10 min",
          "Versículo y oración — 10 min",
        ],
      },
    ],
    // 5 Verdad central
    [
      { t: "quote", text: w.centralTruth },
      ...(ex ? ([{ t: "p", text: `Frase para recordar: «${ex.memoryPhrase}»` }] as GuideBlock[]) : []),
    ],
    // 6 Texto bíblico
    [
      { t: "p", text: w.mainVerses },
      { t: "p", text: w.fullBibleTextRef },
    ],
    // 7 Versículo clave
    [{ t: "quote", text: w.verseRVR1960.text, cite: `${w.verseRVR1960.ref} (RVR1960)` }],
    // 8 Objetivo de aprendizaje
    [
      {
        t: "p",
        text: `Al terminar la clase, cada niño podrá decir con sus propias palabras: «${w.centralTruth}»`,
      },
      { t: "h", text: "Conceptos que el niño debe comprender" },
      { t: "ul", items: w.doctrinalConcepts },
    ],
    // 9 Base doctrinal
    [
      { t: "h", text: "Qué afirma el texto bíblico" },
      { t: "p", text: w.doctrinalBase.textAffirms },
      { t: "h", text: "Qué enseñanza doctrinal se deriva legítimamente" },
      { t: "p", text: w.doctrinalBase.legitimateDerivation },
      { t: "h", text: "Qué aplicación corresponde para los niños" },
      { t: "p", text: w.doctrinalBase.applicationForChildren },
      { t: "h", text: "Qué NO se debe enseñar a partir de este texto" },
      { t: "p", text: w.doctrinalBase.doNotTeach },
      { t: "h", text: "Errores doctrinales que el maestro debe evitar" },
      { t: "p", text: w.doctrinalBase.commonErrorsToAvoid },
      { t: "ul", items: w.teacherErrorsToAvoid },
      { t: "h", text: "Lugar de esta semana en el módulo" },
      {
        t: "p",
        text: mod
          ? `Esta semana pertenece al Módulo ${mod.id}: «${mod.title}» (semanas ${mod.weekStart}–${mod.weekEnd}). Conecta con las semanas anteriores del módulo sin repetirlas.`
          : "Esta semana forma parte del Plan Anual de CIMIENTO.",
      },
      {
        t: "note",
        text: "Esta base doctrinal se limita a lo definido para CIMIENTO. Si un niño plantea una pregunta que no está cubierta aquí, no la presentes como doctrina oficial de CIMIENTO: anótala y consúltala con el pastor.",
      },
    ],
    // 10 Introducción
    [{ t: "p", text: w.introduction }],
    // 11 Desarrollo
    [{ t: "ol", items: splitNumbered(w.developmentOutline) }],
    // 12 Preguntas
    [{ t: "ol", items: w.questionsForChildren }],
    // 13 Explicación del texto
    [{ t: "p", text: w.biblicalExplanation }],
    // 14 Aplicación
    [
      { t: "p", text: w.practicalApplication },
      { t: "h", text: "Aplicación para los niños" },
      { t: "p", text: w.doctrinalBase.applicationForChildren },
    ],
    // 15 Dinámica / actividad
    [
      { t: "h", text: "Dinámica" },
      { t: "p", text: w.dynamic },
      { t: "h", text: "Actividad / manualidad" },
      { t: "p", text: w.activity },
    ],
    // 16 Materiales
    [
      { t: "h", text: "Materiales de la actividad" },
      { t: "ul", items: w.materials },
      { t: "h", text: "Preparación previa" },
      { t: "ul", items: w.priorPreparation },
      { t: "h", text: "Recursos para imprimir antes de la clase" },
      {
        t: "ul",
        items: [
          "Hoja de trabajo (una por cada niño de 5 a 10 años)",
          "Hoja para colorear (una por cada niño de 3 a 5 años)",
          "Tarjeta del versículo para llevar a casa (una por niño)",
        ],
      },
    ],
    // 17 Transición
    [{ t: "p", text: ex ? ex.transition : pending }],
    // 18 Cierre
    [{ t: "p", text: w.closing }],
    // 19 Oración
    [{ t: "quote", text: w.suggestedPrayer }],
    // 20 PowerPoint
    ex ? pptBlocks(w, ex) : [{ t: "p", text: pending }],
    // 21 Hoja de trabajo
    ex ? worksheetBlocks(w, ex) : [{ t: "p", text: pending }],
    // 22 Versículo para llevar a casa
    ex ? verseBlocks(w, ex) : [{ t: "p", text: pending }],
    // 23 Adaptación por edad
    ex ? ageBlocks(w, ex) : [{ t: "p", text: pending }],
  ];

  return GUIDE_SECTION_TITLES.map((title, i) => ({
    number: i + 1,
    key: `s${String(i + 1).padStart(2, "0")}`,
    title,
    blocks: bodies[i],
  }));
}

type Extras = NonNullable<ReturnType<typeof getGuideExtras>>;

function pptBlocks(w: WeekGuide, ex: Extras): GuideBlock[] {
  const s = ex.slides;
  const links: { label: string; href: string }[] = [];
  if (w.teacherPresentation.fileUrl) links.push({ label: "Abrir presentación (PDF)", href: w.teacherPresentation.fileUrl });
  if (w.teacherPresentation.secondaryUrl)
    links.push({ label: w.teacherPresentation.secondaryLabel ?? "Descargar PowerPoint", href: w.teacherPresentation.secondaryUrl });
  return [
    { t: "h", text: "Cómo utilizar este recurso" },
    {
      t: "p",
      text: "La presentación tiene 9 diapositivas pensadas para proyectarse a los niños. Acompaña la clase, no la sustituye: el desarrollo completo está en esta guía.",
    },
    {
      t: "ol",
      items: [
        `Bienvenida (5 min): abre la diapositiva 1 («${s.title}») mientras los niños llegan. En la diapositiva 2 plantea la pregunta «${s.initialQuestion}» y escucha dos o tres respuestas sin corregir todavía.`,
        `Enseñanza bíblica (20 min): con tu Biblia abierta en ${w.mainVerses}, narra la lección con tus palabras y apóyate en las diapositivas 3 («${s.mainIdea}»), 4 («${s.teachingTitle}» ${s.teachingItems.join(", ")}) y 5 («${s.bigLine}»). No las leas de corrido: úsalas como apoyo visual.`,
        `Participación: en la diapositiva 6 detén la narración y pregunta «${s.participation}». Deja que los niños respondan por turnos.`,
        `Versículo (diapositiva 7): lee ${w.verseRVR1960.ref} directamente de tu Biblia y luego proyéctalo; repítanlo en voz alta en partes cortas.`,
        `Actividad (diapositiva 8): proyéctala mientras explicas la actividad: «${s.activity}»`,
        `Cierre (diapositiva 9): proyecta la oración final y oren juntos: «${s.closingPrayer}»`,
      ],
    },
    {
      t: "note",
      text: "Para interactuar sin leer: haz la pregunta, espera la respuesta de los niños y recién entonces avanza a la siguiente diapositiva. Si falla la proyección, la clase puede darse completa solo con esta guía.",
    },
    { t: "links", links },
  ];
}

function worksheetBlocks(w: WeekGuide, ex: Extras): GuideBlock[] {
  return [
    { t: "h", text: "Cómo utilizar este recurso" },
    { t: "h", text: "Cuándo entregarla" },
    {
      t: "p",
      text: "Después de la Aplicación, junto con la dinámica o actividad (hacia el minuto 40 de la clase), con lápiz y colores a la mano. Está dirigida principalmente a niños de 5 a 10 años; los niños de 3 a 5 años trabajan con la hoja para colorear.",
    },
    { t: "h", text: "Qué explicar" },
    { t: "p", text: "Lee en voz alta las instrucciones de cada actividad antes de que empiecen. La hoja contiene:" },
    { t: "ul", items: ex.worksheet.activities },
    { t: "h", text: "Qué debe hacer el niño" },
    {
      t: "p",
      text: "Completar, marcar, relacionar, escribir y dibujar siguiendo las instrucciones de cada actividad, y poner su nombre y edad en la parte superior.",
    },
    { t: "h", text: "Cómo ayudar según la edad" },
    {
      t: "ul",
      items: [
        "5 a 7 años: lee cada actividad con ellos; pueden dictarte una palabra o apoyarse en el banco de palabras.",
        "8 a 10 años: trabajan de forma independiente y después comparten una respuesta con el grupo.",
      ],
    },
    { t: "h", text: "Cómo revisar la actividad" },
    { t: "ul", items: ex.worksheet.answerKey },
    {
      t: "note",
      text: "Revisa en grupo, sin calificar con nota: lo importante es que el niño exprese la verdad central. Las respuestas personales no tienen respuesta incorrecta.",
    },
    ...(w.studentWorksheet.fileUrl
      ? ([{ t: "links", links: [{ label: "Abrir hoja de trabajo (PDF)", href: w.studentWorksheet.fileUrl }] }] as GuideBlock[])
      : []),
  ];
}

function verseBlocks(w: WeekGuide, ex: Extras): GuideBlock[] {
  return [
    { t: "h", text: "Cómo utilizar este recurso" },
    { t: "h", text: "Cuándo entregarlo" },
    {
      t: "p",
      text: "Al final de la clase, durante «Versículo y oración» (últimos 10 minutos), después de repetir el versículo juntos. Entrégalo al despedirse, no al comenzar, para evitar distracciones.",
    },
    { t: "h", text: "Cómo utilizarlo" },
    {
      t: "p",
      text: `La tarjeta contiene ${w.verseRVR1960.ref} completo en la versión Reina-Valera 1960 y la frase corta «${ex.memoryPhrase}». Lee ambos con los niños y explica que es para colocar en un lugar visible de la casa.`,
    },
    { t: "h", text: "Cómo ayudar al niño a memorizarlo" },
    {
      t: "ol",
      items: [
        "Lee el versículo en frases cortas y los niños repiten después de ti (eco).",
        "Repítanlo con gestos sencillos para recordar cada parte.",
        "Pídeles que lo digan sin mirar la tarjeta; ayúdales con la primera palabra de cada frase.",
        `Con niños de 3 a 5 años basta con la frase corta «${ex.memoryPhrase}».`,
        "Anima a cada niño a decirlo a un familiar durante la semana y repásenlo al inicio de la próxima clase.",
      ],
    },
    {
      t: "note",
      text: "Impresión: tarjeta preparada para hoja tamaño carta con fondo claro y poco consumo de tinta; se puede recortar por el borde dorado.",
    },
    ...(w.verseCard.fileUrl
      ? ([{ t: "links", links: [{ label: "Abrir tarjeta del versículo (PDF)", href: w.verseCard.fileUrl }] }] as GuideBlock[])
      : []),
  ];
}

function ageBlocks(w: WeekGuide, ex: Extras): GuideBlock[] {
  const mk = (base: typeof AGE_BASE.a35, wk: { activity: string; questions: string }): GuideBlock[] => [
    { t: "h", text: base.label },
    {
      t: "kv",
      pairs: [
        ["Lenguaje", base.language],
        ["Actividad", wk.activity],
        ["Preguntas", wk.questions],
        ["Duración", base.duration],
        ["Participación", base.participation],
      ],
    },
  ];
  return [
    {
      t: "p",
      text: "No se trata de tres clases distintas: es la misma lección adaptada en lenguaje, actividad, preguntas, duración y participación.",
    },
    ...mk(AGE_BASE.a35, ex.ages.a35),
    { t: "p", text: `Sugerencia adicional para esta semana: ${w.adaptationYounger}` },
    ...mk(AGE_BASE.a57, ex.ages.a57),
    ...mk(AGE_BASE.a810, ex.ages.a810),
    { t: "p", text: `Sugerencia adicional para esta semana: ${w.adaptationOlder}` },
  ];
}
