import type { WeekGuide } from "../weekTypes";

export const week01: WeekGuide = {
  week: 1,
  module: 1,
  title: "Dios me creó",
  status: "developed",
  ageRange: "3–10 años",
  objective:
    "Que el niño entienda que Dios es el Creador de todo lo que existe, y que él o ella fue creado por un acto intencional de Dios, no por accidente.",
  centralTruth: "Dios me creó a mí, con propósito.",
  mainVerses: "Génesis 1:26–31",
  fullBibleTextRef:
    "Génesis 1:26–31 (creación del ser humano, día sexto) y Génesis 2:7 (formación del hombre del polvo y aliento de vida). Leer directamente de una Biblia en español durante la preparación; este documento no reproduce el texto bíblico completo.",
  doctrinalConcepts: [
    "Dios como único Creador",
    "La creación del ser humano como acto deliberado, distinto del resto de la creación",
    "Origen intencional de la existencia humana",
  ],

  doctrinalBase: {
    textAffirms:
      'Génesis 1:26–31 relata que Dios creó al ser humano el sexto día, mediante una decisión deliberada ("Hagamos al hombre"), varón y hembra, encomendándoles gobernar sobre la creación. Génesis 2:7 añade que Dios formó al hombre del polvo de la tierra y sopló en él aliento de vida.',
    legitimateDerivation:
      "La existencia del ser humano tiene un origen intencional y personal en Dios, no impersonal ni casual. Este es el fundamento sobre el que se construyen las siguientes tres semanas del módulo (imagen de Dios, conocimiento de Dios, valor).",
    applicationForChildren:
      "El niño puede entender, a su nivel, que no es un accidente: existe porque Dios lo hizo con propósito, igual que hizo a Adán.",
    doNotTeach:
      "El texto no responde preguntas sobre el mecanismo o el tiempo de la creación en términos científicos modernos (edad de la tierra, proceso biológico exacto). Afirma QUIÉN creó y QUE HUBO PROPÓSITO, no debate el CÓMO en términos científicos.",
    commonErrorsToAvoid:
      "Convertir la lección en una defensa o debate científico (creación vs. evolución) en vez de una enseñanza teológica sobre identidad; y desautorizar con dureza opiniones familiares distintas en vez de enseñar con calma lo que el texto bíblico afirma.",
  },

  introduction:
    'Comenzar preguntando a los niños: "¿Alguna vez te has preguntado quién te hizo?" Escuchar respuestas breves antes de abrir la Biblia.',
  developmentOutline:
    "1) Leer/narrar Génesis 1:26–31. 2) Leer Génesis 2:7. 3) Explicar la diferencia entre la creación del ser humano y la del resto de los seres vivos (deliberación previa). 4) Conectar con la verdad central.",
  biblicalExplanation:
    'Dios hizo todo lo que existe. Cuando llegó el momento de crear al ser humano, el texto muestra a Dios deliberando ("Hagamos"), algo que no ocurre con el resto de la creación. Luego, en Génesis 2:7, Dios forma al hombre del polvo y le da aliento de vida — un acto cercano y personal, no distante.',
  questionsForChildren: [
    "¿Quién hizo todo lo que existe?",
    "¿Fuiste hecho por accidente o a propósito?",
    "¿Qué usó Dios para formar al primer hombre?",
  ],
  activity:
    'Autorretrato simple con la frase "Dios me creó" (dibujo o recorte de figura humana con el nombre del niño).',
  dynamic:
    '"Yo fui hecho a propósito": cada niño menciona algo que le gusta de sí mismo mientras el maestro refuerza: "Dios te hizo así, con propósito."',
  practicalApplication:
    'Conversar: "¿Cómo cambia saber que Dios te hizo a propósito la forma en que piensas de ti mismo?"',
  suggestedPrayer:
    "Gracias, Dios, porque tú me hiciste. Ayúdame a recordar que soy tuyo. Amén.",
  materials: ["Papel", "Crayones o marcadores", "Plantilla de figura humana (para 3–4 años)"],
  priorPreparation: [
    "Leer Génesis 1:26–31 y 2:7 directamente de la Biblia",
    "Repasar la base doctrinal de esta guía",
    "Preparar los materiales de la manualidad",
    "Revisar las preguntas de comprobación",
  ],
  teacherErrorsToAvoid: [
    "Convertir la clase en un debate científico sobre el origen del universo",
    "Basar el valor del niño en su comportamiento durante la clase, contradiciendo la verdad central",
    "Introducir el tema del pecado o la salvación (corresponde a otro módulo)",
  ],
  adaptationYounger:
    'Usar frases muy cortas ("Dios te hizo") con repetición y movimiento; mostrar imágenes grandes y simples de la creación.',
  adaptationOlder:
    'Leer el texto bíblico directamente; conversar sobre qué significa que Dios "deliberara" antes de crear al ser humano, a diferencia del resto de la creación.',
  closing:
    "Repetir juntos la frase para recordar (\"Dios me hizo\") y orar agradeciendo a Dios por la creación de cada niño.",

  examQuestions: [
    {
      id: "s1-q1",
      type: "doctrinal",
      prompt:
        "Según Génesis 1:26–27, ¿qué distingue la creación del ser humano de la del resto de los seres vivos en el relato?",
      options: [
        { id: "a", text: "Fue el último día de la creación" },
        { id: "b", text: 'Estuvo precedida por una deliberación divina ("Hagamos al hombre")' },
        { id: "c", text: "Fue creado de agua, no de tierra" },
        { id: "d", text: "No se menciona explícitamente en el texto" },
      ],
      correctOptionId: "b",
      explanation:
        'A diferencia de las plantas y animales, la creación del ser humano está precedida por la deliberación "Hagamos al hombre a nuestra imagen" (Gn 1:26), marcando un acto distinto y deliberado.',
    },
    {
      id: "s1-q2",
      type: "true_false",
      prompt:
        "Génesis 2:7 explica el proceso biológico exacto mediante el cual Dios formó al ser humano, respondiendo así a preguntas científicas modernas sobre el origen del hombre.",
      options: [
        { id: "v", text: "Verdadero" },
        { id: "f", text: "Falso" },
      ],
      correctOptionId: "f",
      explanation:
        "El texto afirma QUIÉN creó y CON QUÉ PROPÓSITO, no debate mecanismos científicos modernos. Presentar el texto como respuesta a debates científicos actuales excede lo que el texto realmente afirma.",
    },
    {
      id: "s1-q3",
      type: "comprehension",
      prompt: "¿Cuál es la verdad central de la Semana 1?",
      options: [
        { id: "a", text: "Dios me ama a pesar de mis errores" },
        { id: "b", text: "Dios me creó a mí, con propósito" },
        { id: "c", text: "Debo obedecer a mis padres" },
        { id: "d", text: "Jesús murió por mis pecados" },
      ],
      correctOptionId: "b",
      explanation:
        "Es la verdad central de esta semana. Las otras opciones pertenecen a módulos posteriores (amor de Dios y salvación en los Módulos 3–5, obediencia en el Módulo 7) y no deben introducirse todavía.",
    },
    {
      id: "s1-q4",
      type: "scenario",
      prompt:
        "Un niño en tu clase dice: \"Mi mamá me contó que venimos de los monos, no de Dios.\" Según el enfoque doctrinal de esta lección, ¿cuál es la respuesta más apropiada del maestro?",
      options: [
        { id: "a", text: "Corregir enérgicamente al niño y decirle que su mamá está equivocada" },
        { id: "b", text: "Ignorar el comentario para evitar conflicto" },
        {
          id: "c",
          text: "Reconocer con respeto el comentario, y enseñar con calma lo que la Biblia afirma: que Dios creó al ser humano de forma intencional, sin entrar en un debate científico con el niño",
        },
        { id: "d", text: "Explicar en detalle las teorías de la evolución para contrastarlas" },
      ],
      correctOptionId: "c",
      explanation:
        "La base doctrinal de esta lección evita explícitamente convertir la clase en un debate científico. El maestro enseña con respeto lo que el texto bíblico afirma, sin desautorizar con dureza a la familia ni entrar en polémicas que exceden el nivel y el objetivo de la clase.",
    },
    {
      id: "s1-q5",
      type: "pedagogical",
      prompt:
        '¿Cuál es el propósito principal de la dinámica "Yo fui hecho a propósito" en esta lección?',
      options: [
        { id: "a", text: "Evaluar la memoria bíblica de los niños" },
        { id: "b", text: "Reforzar de manera experiencial que cada niño fue creado con propósito por Dios" },
        { id: "c", text: "Enseñar normas de comportamiento en el aula" },
        { id: "d", text: "Medir la capacidad de dibujo de los niños" },
      ],
      correctOptionId: "b",
      explanation:
        "La dinámica está diseñada para que cada niño conecte algo personal ('algo que le gusta de sí mismo') con la verdad central de que fue creado con propósito — no es una evaluación de memoria ni de conducta.",
    },
    {
      id: "s1-q6",
      type: "doctrinal",
      prompt:
        "Es apropiado, en esta lección, explicar a los niños que aunque hayan pecado, Dios los ama y por eso los creó.",
      options: [
        { id: "v", text: "Verdadero" },
        { id: "f", text: "Falso" },
      ],
      correctOptionId: "f",
      explanation:
        "El pecado y la salvación corresponden a los Módulos 4 y 5, no a esta semana. Introducirlos aquí sería una conexión artificial que la base doctrinal de esta lección evita explícitamente: el objetivo es identidad y creación, no redención.",
    },
    {
      id: "s1-q7",
      type: "comprehension",
      prompt: "Según Génesis 2:7, ¿qué dos elementos se mencionan en la formación del hombre?",
      options: [
        { id: "a", text: "Agua y luz" },
        { id: "b", text: "Polvo de la tierra y aliento de vida" },
        { id: "c", text: "Fuego y barro" },
        { id: "d", text: "Sangre y hueso" },
      ],
      correctOptionId: "b",
      explanation: "Génesis 2:7 dice que Dios formó al hombre del polvo de la tierra y sopló en su nariz aliento de vida.",
    },
    {
      id: "s1-q8",
      type: "scenario",
      prompt:
        "Durante la aplicación, un niño dice que no le gusta cómo se ve. ¿Cuál es la respuesta más alineada con la verdad central de esta semana?",
      options: [
        { id: "a", text: "Decirle que no importa su apariencia porque lo que cuenta es el comportamiento" },
        { id: "b", text: "Recordarle que Dios lo creó a propósito, y que su valor no depende de su apariencia" },
        { id: "c", text: "Cambiar de tema rápidamente" },
        { id: "d", text: "Decirle que cuando sea mayor se sentirá diferente" },
      ],
      correctOptionId: "b",
      explanation:
        "La respuesta debe conectar directamente con la verdad central de la semana: el niño fue creado a propósito por Dios; ese es el fundamento de su valor, no su apariencia ni su comportamiento.",
    },
    {
      id: "s1-q9",
      type: "matching",
      needsPastoralReview: true,
      prompt:
        "Relaciona cada elemento con su significado según la base doctrinal de la lección.",
      options: [],
      correctOptionId: "",
      pairs: [
        { left: "Génesis 1:26 («Hagamos al hombre…»)", right: "La creación del ser humano estuvo precedida por una deliberación divina" },
        { left: "Génesis 2:7", right: "Dios formó al hombre del polvo y sopló en él aliento de vida" },
        { left: "Lo que el texto afirma", right: "QUIÉN creó y que hubo propósito" },
        { left: "Lo que el texto no resuelve", right: "El mecanismo y el tiempo de la creación en términos científicos" },
      ],
      explanation:
        "Según la base doctrinal de la semana: el texto afirma quién creó y que hubo propósito (no debate el cómo en términos científicos); Génesis 1:26 muestra la deliberación divina y Génesis 2:7 la formación del hombre del polvo con aliento de vida.",
    },
  ],

  teacherPresentation: {
    title: "Presentación del maestro — Semana 1",
    status: "available",
    fileUrl: "/recursos-semana-1/presentacion-semana-1.pdf",
    secondaryUrl: "/recursos-semana-1/presentacion-semana-1.pptx",
    secondaryLabel: "Descargar en PowerPoint (.pptx)",
  },
  studentWorksheet: {
    title: "Hoja de trabajo del estudiante (5–10 años) — Semana 1",
    status: "available",
    fileUrl: "/recursos-semana-1/hoja-trabajo-semana-1.pdf",
  },
  coloringSheet: {
    title: "Hoja para colorear (3–5 años) — Semana 1",
    status: "available",
    fileUrl: "/recursos-semana-1/colorear-semana-1.pdf",
  },
  verseCard: {
    title: "Versículo para llevar a casa — Semana 1",
    status: "available",
    fileUrl: "/recursos-semana-1/versiculo-semana-1.pdf",
  },
  verseRVR1960: {
    ref: "Génesis 1:27",
    text: "Y creó Dios al hombre a su imagen, a imagen de Dios lo creó; varón y hembra los creó.",
  },
  externalResources: [
    {
      label: "Historia adaptada de Súper Libro",
      name: '"En el principio" (CBN Superlibro, Temporada 1)',
      description:
        "Episodio animado sobre la creación (Génesis), en español. Revísalo antes de mostrarlo a los niños.",
      url: "https://www.cbn.com/superbook/espanol/",
    },
    {
      label: "Canción de Pequeños Héroes",
      name: '"Dios De La Creación"',
      description:
        "Canción infantil cristiana en español sobre la creación, del canal oficial de Pequeños Héroes.",
      url: "https://www.youtube.com/channel/UCwnmHLNwY0WRLFqnZMMIIFQ",
    },
    {
      label: "Recurso doctrinal para el maestro",
      name: "Coalición por el Evangelio",
      description:
        "Artículos de sana doctrina en español sobre la creación y la dignidad humana, para profundizar tu preparación.",
      url: "https://www.coalicionporelevangelio.org/",
    },
  ],
};
