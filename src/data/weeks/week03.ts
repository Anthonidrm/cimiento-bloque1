import type { WeekGuide } from "../weekTypes";

export const week03: WeekGuide = {
  week: 3,
  module: 1,
  title: "Dios me conoce",
  status: "developed",
  ageRange: "3–10 años",
  objective:
    "Que el niño entienda que Dios no solo lo creó de forma general, sino que lo conoce a él o ella en particular, de manera íntima, desde antes de nacer.",
  centralTruth: "Dios me conoce por completo, y aun así me formó con cuidado.",
  mainVerses: "Salmo 139:13–16",
  fullBibleTextRef:
    "Salmo 139:13–16 (Dios formó mis entrañas, me entretejió en el vientre) y Salmo 139:1–6 (Dios conoce mis pensamientos, mi andar, mis palabras). Leer directamente de una Biblia en español durante la preparación; este documento no reproduce el texto bíblico completo.",
  doctrinalConcepts: [
    "Omnisciencia relacional de Dios",
    "Conocimiento íntimo y personal de Dios hacia cada individuo",
    "Formación prenatal como acto de Dios",
  ],

  doctrinalBase: {
    textAffirms:
      'Salmo 139:1–6 declara que Dios conoce los pensamientos, el andar y las palabras de una persona, incluso antes de que las diga. Salmo 139:13–16 añade que Dios formó las entrañas de esa persona y la "entretejió" en el vientre de su madre, viendo su existencia antes de que naciera.',
    legitimateDerivation:
      "El conocimiento de Dios sobre cada persona es específico, individual e íntimo — no genérico ni distante — y comenzó antes del nacimiento. Profundiza lo aprendido en las semanas 1 y 2: el Dios que crea, a su imagen, también conoce íntimamente a cada persona que creó.",
    applicationForChildren:
      "El niño puede entender que Dios lo conoce mejor que cualquier persona en su vida — sus pensamientos, sus gustos, sus miedos — y que ese conocimiento viene acompañado de cuidado, no de vigilancia amenazante.",
    doNotTeach:
      'Que "Dios me conoce" funciona como una fórmula mágica que garantiza que Dios cumplirá cada deseo. Tampoco reducir el conocimiento de Dios a un dato abstracto sin conexión con el cuidado personal que el salmo describe.',
    commonErrorsToAvoid:
      "Presentar el conocimiento de Dios de forma que genere temor en vez de cercanía; convertir el salmo en una lección de biología prenatal en vez de una expresión de adoración; prometer resultados específicos que el texto no promete.",
  },

  introduction: "¿Quién es alguien que te conoce muy bien? ¿Cómo lo sabes? Escuchar respuestas breves.",
  developmentOutline:
    "1) Leer Salmo 139:1–6. 2) Leer Salmo 139:13–16. 3) Explicar que David escribió esto para expresar asombro, no temor, ante el conocimiento íntimo de Dios. 4) Conectar con la verdad central.",
  biblicalExplanation:
    "El rey David escribió que Dios conocía todos sus pensamientos, su forma de caminar, y hasta las palabras que iba a decir antes de decirlas. Dios lo formó cuidadosamente dentro de su madre, viéndolo crecer aun antes de nacer. David no se sintió vigilado, sino cuidado — y eso mismo es cierto de cada niño en la clase.",
  questionsForChildren: [
    "Según el Salmo 139, ¿desde cuándo te conoce Dios?",
    "¿Qué cosas de ti conoce Dios, según este salmo?",
    "¿El conocimiento de Dios sobre ti es un dato lejano o algo cercano y cuidadoso?",
  ],
  activity:
    'Tarjeta "Dios me conoce" con un espacio para que el niño (o un adulto por él) escriba su nombre y una cosa que le gusta, recordando que Dios ya lo sabía antes de que él lo dijera.',
  dynamic:
    '"¿Me conoces?": el maestro menciona datos sobre algunos niños (sin nombrarlos) y el grupo adivina de quién se trata; luego conecta: "Dios conoce cosas de ti que ni siquiera tus amigos más cercanos saben."',
  practicalApplication: "¿Cómo te hace sentir saber que Dios te conoce por completo, incluso lo que piensas?",
  suggestedPrayer: "Gracias, Dios, porque me conoces por completo y me formaste con cuidado. Amén.",
  materials: ["Cartulina o papel grueso", "Marcadores", "Plantilla de tarjeta"],
  priorPreparation: [
    "Leer el Salmo 139:1–6 y 13–16 directamente de la Biblia",
    "Repasar la base doctrinal de esta guía",
    "Preparar los materiales de la manualidad",
    "Revisar las preguntas de comprobación",
  ],
  teacherErrorsToAvoid: [
    "Presentar el conocimiento de Dios como vigilancia amenazante en vez de cuidado",
    "Prometer resultados o deseos garantizados basados en este pasaje",
    "Convertir el salmo en una clase de biología en vez de una enseñanza sobre la cercanía de Dios",
  ],
  adaptationYounger:
    'Usar frases muy simples ("Dios te conoce, Dios te ama") y repetición; evitar el vocabulario abstracto del salmo.',
  adaptationOlder:
    "Leer directamente varios versículos del Salmo 139:1–6 y conversar sobre qué significa que Dios conozca los pensamientos antes de expresarlos.",
  closing:
    'Repetir la frase para recordar ("Dios me conoce") y orar agradeciendo el cuidado íntimo de Dios.',

  examQuestions: [
    {
      id: "s3-q1",
      type: "comprehension",
      prompt: "Según Salmo 139:13–16, ¿cuándo comenzó el conocimiento de Dios sobre una persona?",
      options: [
        { id: "a", text: "Cuando esa persona aprende a hablar" },
        { id: "b", text: "Antes de que naciera, mientras era formada en el vientre" },
        { id: "c", text: "Solo después del bautismo" },
        { id: "d", text: "El salmo no lo especifica" },
      ],
      correctOptionId: "b",
      explanation:
        'El salmo describe a Dios formando las entrañas de la persona y viendo su existencia "en el vientre", antes del nacimiento.',
    },
    {
      id: "s3-q2",
      type: "true_false",
      prompt:
        "El Salmo 139 enseña que, si Dios conoce a alguien, esa persona puede pedir cualquier cosa y Dios se la concederá.",
      options: [
        { id: "v", text: "Verdadero" },
        { id: "f", text: "Falso" },
      ],
      correctOptionId: "f",
      explanation:
        "El salmo no promete el cumplimiento de deseos; describe el conocimiento íntimo y el cuidado de Dios, no un mecanismo de peticiones garantizadas. Enseñar lo contrario distorsiona el propósito del texto.",
    },
    {
      id: "s3-q3",
      type: "doctrinal",
      prompt: "¿Cuál es el tono correcto para presentar el conocimiento de Dios descrito en el Salmo 139?",
      options: [
        { id: "a", text: "Temor, como si Dios vigilara para castigar" },
        { id: "b", text: "Asombro y cercanía, como cuidado personal" },
        { id: "c", text: "Indiferencia, como un dato sin importancia" },
        { id: "d", text: "Curiosidad científica sobre el desarrollo prenatal" },
      ],
      correctOptionId: "b",
      explanation:
        "David escribe el salmo como una expresión de asombro y adoración ante la cercanía de Dios, no como advertencia de vigilancia ni como explicación biológica.",
    },
    {
      id: "s3-q4",
      type: "scenario",
      prompt:
        "Un niño dice que le da miedo que Dios 'sepa todo lo que hace'. ¿Cuál es la mejor respuesta del maestro según esta lección?",
      options: [
        { id: "a", text: "Decirle que tiene razón en tener miedo, porque Dios ve todo lo malo que hace" },
        {
          id: "b",
          text: "Explicarle que el conocimiento de Dios en este salmo va junto con su cuidado cercano, no con un castigo constante",
        },
        { id: "c", text: "Cambiar de tema para no generar incomodidad" },
        { id: "d", text: "Decirle que Dios solo conoce a los adultos, no a los niños" },
      ],
      correctOptionId: "b",
      explanation:
        "La base doctrinal advierte específicamente contra presentar el conocimiento de Dios de forma que genere temor; el maestro debe reconducir hacia la cercanía y el cuidado que el salmo realmente describe.",
    },
    {
      id: "s3-q5",
      type: "comprehension",
      prompt: "Según Salmo 139:1–6, ¿qué conoce Dios de una persona además de su cuerpo?",
      options: [
        { id: "a", text: "Solo su nombre" },
        { id: "b", text: "Sus pensamientos, su andar y sus palabras antes de decirlas" },
        { id: "c", text: "Únicamente su futuro laboral" },
        { id: "d", text: "El salmo no menciona nada más" },
      ],
      correctOptionId: "b",
      explanation:
        "Salmo 139:1–6 detalla que Dios conoce los pensamientos, el actuar diario y las palabras de la persona incluso antes de pronunciarlas.",
    },
    {
      id: "s3-q6",
      type: "pedagogical",
      prompt: '¿Qué conecta la dinámica "¿Me conoces?" con la verdad central de la semana?',
      options: [
        { id: "a", text: "Evalúa qué tan buenos son los niños adivinando" },
        {
          id: "b",
          text: "Muestra que hay datos personales que solo alguien cercano conoce, y contrasta eso con la intimidad aún mayor del conocimiento de Dios",
        },
        { id: "c", text: "Sirve solo como juego de entretenimiento sin relación con el tema" },
        { id: "d", text: "Prepara a los niños para un examen de memoria" },
      ],
      correctOptionId: "b",
      explanation:
        "La dinámica usa el conocimiento humano cercano como punto de comparación concreto, y luego el maestro conecta con la idea de que Dios conoce a cada niño de forma aún más íntima.",
    },
    {
      id: "s3-q7",
      type: "doctrinal",
      prompt:
        "Es apropiado, en esta lección, explicar en detalle el proceso biológico del desarrollo prenatal como tema principal de la clase.",
      options: [
        { id: "v", text: "Verdadero" },
        { id: "f", text: "Falso" },
      ],
      correctOptionId: "f",
      explanation:
        "El Salmo 139 es una expresión poética de adoración sobre la cercanía de Dios, no una lección de biología. Convertir la clase en una explicación biológica es uno de los errores que esta lección busca evitar explícitamente.",
    },
    {
      id: "s3-q8",
      type: "scenario",
      prompt:
        "Un niño comparte que se siente solo en casa. ¿Cómo debería el maestro conectar esto con la enseñanza de hoy?",
      options: [
        { id: "a", text: "Decirle que hable con un adulto y cambiar de tema sin más" },
        {
          id: "b",
          text: "Recordarle, con cuidado pastoral, que el Salmo 139 enseña que Dios lo conoce y está cerca de él, sin minimizar lo que siente",
        },
        { id: "c", text: "Decirle que no debería sentirse así" },
        { id: "d", text: "Ignorar el comentario para no perder tiempo de clase" },
      ],
      correctOptionId: "b",
      explanation:
        "La aplicación de esta lección invita a que el niño encuentre consuelo en la cercanía de Dios descrita en el salmo, validando lo que siente mientras se le recuerda esa verdad.",
    },
    {
      id: "s3-q9",
      type: "matching",
      needsPastoralReview: true,
      prompt:
        "Relaciona cada elemento con su significado según la base doctrinal de la lección.",
      options: [],
      correctOptionId: "",
      pairs: [
        { left: "Salmo 139:13–16", right: "Dios formó a la persona con cuidado y la conocía desde antes de nacer" },
        { left: "Carácter del conocimiento de Dios", right: "Específico, individual e íntimo — no genérico ni distante" },
        { left: "Tono correcto al enseñar este salmo", right: "Cercanía y adoración, no temor" },
        { left: "Error a evitar con este salmo", right: "Convertirlo en una lección de biología prenatal" },
      ],
      explanation:
        "Según la base doctrinal de la semana: el conocimiento de Dios es específico, individual e íntimo y comenzó antes del nacimiento; el salmo se enseña con cercanía y adoración, no con temor, y sin convertirlo en una lección de biología prenatal.",
    },
  ],

  teacherPresentation: {
    title: "Presentación del maestro — Semana 3",
    status: "available",
    fileUrl: "/recursos-semana-3/presentacion-semana-3.pdf",
    secondaryUrl: "/recursos-semana-3/presentacion-semana-3.pptx",
    secondaryLabel: "Descargar en PowerPoint (.pptx)",
  },
  studentWorksheet: {
    title: "Hoja de trabajo del estudiante (5–10 años) — Semana 3",
    status: "available",
    fileUrl: "/recursos-semana-3/hoja-trabajo-semana-3.pdf",
  },
  coloringSheet: {
    title: "Hoja para colorear (3–5 años) — Semana 3",
    status: "available",
    fileUrl: "/recursos-semana-3/colorear-semana-3.pdf",
  },
  verseCard: {
    title: "Versículo para llevar a casa — Semana 3",
    status: "available",
    fileUrl: "/recursos-semana-3/versiculo-semana-3.pdf",
  },
  verseRVR1960: {
    ref: "Salmo 139:14",
    text: "Te alabaré; porque formidables, maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.",
  },
  externalResources: [
    {
      label: "Historia adaptada de Súper Libro",
      name: "Catálogo de episodios (CBN Superlibro)",
      description:
        "No hay un episodio específico sobre el Salmo 139; explora el catálogo oficial en español y elige uno sobre el cuidado de Dios.",
      url: "https://www.cbn.com/superbook/espanol/",
    },
    {
      label: "Canción de Pequeños Héroes",
      name: "Canal oficial",
      description:
        "Explora el canal de Pequeños Héroes en español y elige una canción sobre el amor y cuidado de Dios que se ajuste a tu grupo.",
      url: "https://www.youtube.com/channel/UCwnmHLNwY0WRLFqnZMMIIFQ",
    },
    {
      label: "Recurso doctrinal para el maestro",
      name: "Coalición por el Evangelio",
      description:
        "Artículos de sana doctrina en español sobre la omnisciencia y el cuidado personal de Dios.",
      url: "https://www.coalicionporelevangelio.org/",
    },
  ],
};
