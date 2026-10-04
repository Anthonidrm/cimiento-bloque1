import type { WeekGuide } from "../weekTypes";

export const week02: WeekGuide = {
  week: 2,
  module: 1,
  title: "Fui creado a imagen de Dios",
  status: "developed",
  ageRange: "3–10 años",
  objective:
    "Que el niño comprenda que fue creado a imagen y semejanza de Dios, lo cual lo distingue del resto de la creación y le da una dignidad especial — sin igualarlo a Dios.",
  centralTruth:
    "Fui creado a imagen de Dios; por eso soy diferente de los animales y las plantas, y tengo un valor especial.",
  mainVerses: "Génesis 1:26–27",
  fullBibleTextRef:
    "Génesis 1:26–27 (creación a imagen de Dios) y Génesis 5:1–2 (la imagen continúa en los descendientes de Adán). Leer directamente de una Biblia en español durante la preparación; este documento no reproduce el texto bíblico completo.",
  doctrinalConcepts: [
    "Imagen de Dios (imago Dei)",
    "Dignidad humana universal",
    "Diferencia cualitativa entre el ser humano y el resto de la creación",
  ],

  doctrinalBase: {
    textAffirms:
      'Génesis 1:26–27 declara que Dios creó al ser humano "a su imagen, a imagen de Dios lo creó; varón y hembra los creó." Génesis 5:1–2 repite la misma fórmula al describir a los descendientes de Adán, confirmando que la imagen de Dios no se limita a la primera pareja sino que continúa en toda la humanidad.',
    legitimateDerivation:
      "Portar la imagen de Dios significa reflejar —no igualar— ciertos atributos de Dios (pensar, relacionarse, crear, gobernar con responsabilidad), y es la base de la dignidad humana universal, presente en cada persona sin excepción.",
    applicationForChildren:
      "El niño puede entender que es diferente de un animal o una planta, no porque sea más fuerte o más listo, sino porque Dios lo hizo parecido a Él de una manera especial — y eso es cierto de cada persona que conoce.",
    doNotTeach:
      "Que ser imagen de Dios significa ser divino, perfecto, o tener el mismo poder que Dios. Tampoco que solo algunas personas llevan la imagen de Dios: Génesis 5 confirma que es universal.",
    commonErrorsToAvoid:
      "Confundir 'imagen' con 'igualdad'; explicar la imagen de Dios solo en términos físicos o de apariencia; dar a entender, por edad, capacidad o comportamiento, que alguien lleva 'menos' imagen de Dios que otro.",
  },

  introduction:
    '¿Te has visto en un espejo hoy? ¿A quién te pareces? Dejar que los niños respondan brevemente antes de abrir la Biblia.',
  developmentOutline:
    "1) Leer Génesis 1:26–27. 2) Usar el ejemplo de un espejo o una fotografía familiar para explicar 'imagen'. 3) Leer Génesis 5:1–2 y explicar que la imagen de Dios sigue en cada persona hoy. 4) Conectar con la verdad central.",
  biblicalExplanation:
    'Cuando Dios creó al primer hombre y a la primera mujer, los hizo "a su imagen". Eso significa que reflejamos algo de Dios: podemos pensar, amar, crear y cuidar, como Él. Génesis 5 muestra que esta imagen continuó en los hijos de Adán — y sigue en cada persona hoy, incluidos nosotros.',
  questionsForChildren: [
    "¿Qué significa que fuimos creados 'a imagen de Dios'?",
    "¿Todas las personas llevan la imagen de Dios, o solo algunas?",
    "¿Ser imagen de Dios significa que somos iguales a Dios?",
  ],
  activity:
    'Marco de "espejo" de papel con la frase "Llevo la imagen de Dios", donde el niño coloca su propio reflejo o dibujo.',
  dynamic:
    '"Espejo humano": en parejas, un niño imita los gestos del otro; el maestro conecta: "así como reflejamos gestos, nosotros reflejamos algo de Dios, sin ser Dios."',
  practicalApplication:
    '"Si cada persona que conoces lleva la imagen de Dios, ¿cómo deberías tratarla?"',
  suggestedPrayer:
    "Gracias, Dios, porque me hiciste a tu imagen. Ayúdame a tratar bien a otros porque ellos también son especiales para ti. Amén.",
  materials: ["Cartulina", "Papel de aluminio o espejo pequeño de plástico irrompible", "Marcadores"],
  priorPreparation: [
    "Leer Génesis 1:26–27 y 5:1–2 directamente de la Biblia",
    "Repasar la base doctrinal de esta guía",
    "Preparar los materiales de la manualidad",
    "Revisar las preguntas de comprobación",
  ],
  teacherErrorsToAvoid: [
    "Presentar la imagen de Dios como apariencia física",
    "Dar a entender que algunas personas llevan 'menos' imagen de Dios que otras por edad, discapacidad o comportamiento",
    "Adelantar temas de pecado o caída, que corresponden a otro módulo",
  ],
  adaptationYounger:
    "Usar el ejemplo del espejo de forma muy visual y concreta; repetir la frase corta varias veces.",
  adaptationOlder:
    'Explicar la diferencia entre "parecerse a alguien" y "ser esa persona", aplicándolo a la imagen de Dios; leer ambos textos directamente y conversar sobre por qué Génesis 5 vuelve a mencionar la imagen.',
  closing:
    'Repetir juntos la frase para recordar ("Llevo la imagen de Dios") y orar pidiendo ayuda para tratar a otros con respeto porque también llevan la imagen de Dios.',

  examQuestions: [
    {
      id: "s2-q1",
      type: "doctrinal",
      prompt: "Según Génesis 1:26–27, ¿qué significa que el ser humano fue creado 'a imagen de Dios'?",
      options: [
        { id: "a", text: "Que el ser humano es igual a Dios en poder y conocimiento" },
        { id: "b", text: "Que el ser humano refleja ciertos atributos de Dios, sin ser Dios" },
        { id: "c", text: "Que el ser humano tiene la misma apariencia física que Dios" },
        { id: "d", text: "Que solo Adán y Eva llevaron la imagen de Dios" },
      ],
      correctOptionId: "b",
      explanation:
        'Imagen significa reflejo, no igualdad ni apariencia física — Dios es espíritu. Este principio evita tanto la idea de igualdad con Dios como la de una imagen limitada a la primera pareja.',
    },
    {
      id: "s2-q2",
      type: "true_false",
      prompt:
        "Génesis 5:1–2 es innecesario para esta lección porque Génesis 1:26–27 ya establece todo lo que los niños necesitan saber.",
      options: [
        { id: "v", text: "Verdadero" },
        { id: "f", text: "Falso" },
      ],
      correctOptionId: "f",
      explanation:
        "Génesis 5:1–2 es indispensable porque confirma que la imagen de Dios continúa en los descendientes de Adán y Eva — es decir, en cada niño presente en la clase hoy, no solo en la primera pareja.",
    },
    {
      id: "s2-q3",
      type: "comprehension",
      prompt: "¿Cuál de estas NO es una enseñanza legítima de esta lección?",
      options: [
        { id: "a", text: "Fui creado a imagen de Dios" },
        { id: "b", text: "Soy diferente de los animales y las plantas" },
        { id: "c", text: "Soy igual a Dios porque llevo su imagen" },
        { id: "d", text: "Cada persona que conozco también lleva la imagen de Dios" },
      ],
      correctOptionId: "c",
      explanation:
        "Ser imagen de Dios es reflejar, no igualar. Afirmar igualdad con Dios excede lo que el texto sostiene y es precisamente el error doctrinal que esta lección busca evitar.",
    },
    {
      id: "s2-q4",
      type: "scenario",
      prompt:
        "Un niño pregunta: '¿Los bebés y las personas muy ancianas también llevan la imagen de Dios, aunque no puedan hacer muchas cosas?' ¿Cuál es la respuesta correcta según esta lección?",
      options: [
        { id: "a", text: "No, la imagen de Dios depende de lo que la persona puede hacer" },
        {
          id: "b",
          text: "Sí, todos la llevan sin importar edad o capacidad, porque viene de haber sido creados por Dios, no de lo que hacen",
        },
        { id: "c", text: "Solo los niños en edad escolar la llevan completamente" },
        { id: "d", text: "Es una pregunta demasiado difícil para responder en esta clase" },
      ],
      correctOptionId: "b",
      explanation:
        "La base doctrinal de esta lección advierte explícitamente contra excluir a alguien de portar la imagen de Dios por edad o capacidad. La imagen viene de ser creado por Dios, no del desempeño.",
    },
    {
      id: "s2-q5",
      type: "pedagogical",
      prompt: '¿Cuál es el propósito de la dinámica "Espejo humano" en esta lección?',
      options: [
        { id: "a", text: "Enseñar disciplina y quietud en el aula" },
        {
          id: "b",
          text: "Ilustrar de forma experiencial la diferencia entre reflejar a alguien e igualar a esa persona",
        },
        { id: "c", text: "Evaluar la coordinación motriz de los niños" },
        { id: "d", text: "Preparar una presentación para los padres" },
      ],
      correctOptionId: "b",
      explanation:
        "La dinámica usa la imitación de gestos como puente concreto hacia la idea abstracta de 'imagen': reflejamos algo de otra persona sin ser esa persona — el punto doctrinal central de la semana.",
    },
    {
      id: "s2-q6",
      type: "doctrinal",
      prompt:
        "Es apropiado en esta lección explicar que, después del pecado de Adán y Eva, los seres humanos perdieron completamente la imagen de Dios.",
      options: [
        { id: "v", text: "Verdadero" },
        { id: "f", text: "Falso" },
      ],
      correctOptionId: "f",
      explanation:
        "Este tema no corresponde a esta semana; además, Génesis 5, escrito después de la caída, sigue afirmando que el ser humano lleva la imagen de Dios. Introducir esta idea aquí no está sustentado en el texto usado esta semana.",
    },
    {
      id: "s2-q7",
      type: "comprehension",
      prompt: "Según Génesis 5:1–2, ¿en quién continuó la imagen de Dios después de Adán y Eva?",
      options: [
        { id: "a", text: "Únicamente en su primer hijo" },
        { id: "b", text: "En sus descendientes en general" },
        { id: "c", text: "La imagen de Dios desapareció después de Adán y Eva" },
        { id: "d", text: "El texto no lo menciona" },
      ],
      correctOptionId: "b",
      explanation:
        'Génesis 5:1–2 dice que Adán engendró un hijo "a su semejanza, conforme a su imagen", conectando la imagen de Dios con la descendencia humana en general.',
    },
    {
      id: "s2-q8",
      type: "scenario",
      prompt:
        "Durante la aplicación, un niño dice que un compañero 'no vale tanto' porque se porta mal. ¿Cuál es la respuesta más alineada con la verdad central de esta semana?",
      options: [
        { id: "a", text: "Estar de acuerdo, ya que el comportamiento determina el valor de una persona" },
        {
          id: "b",
          text: "Recordar que ese compañero también fue creado a imagen de Dios, y merece respeto por esa razón, no por su comportamiento",
        },
        { id: "c", text: "Ignorar el comentario" },
        { id: "d", text: "Cambiar al compañero de grupo" },
      ],
      correctOptionId: "b",
      explanation:
        "La aplicación práctica de esta lección es tratar a otros con respeto porque llevan la imagen de Dios — un fundamento que no depende del comportamiento de la persona.",
    },
  ],

  teacherPresentation: {
    title: "Presentación del maestro — Semana 2",
    status: "available",
    fileUrl: "/recursos-semana-2/presentacion-semana-2.pdf",
    secondaryUrl: "/recursos-semana-2/presentacion-semana-2.pptx",
    secondaryLabel: "Descargar en PowerPoint (.pptx)",
  },
  studentWorksheet: {
    title: "Hoja de trabajo del estudiante (5–10 años) — Semana 2",
    status: "available",
    fileUrl: "/recursos-semana-2/hoja-trabajo-semana-2.pdf",
  },
  coloringSheet: {
    title: "Hoja para colorear (3–5 años) — Semana 2",
    status: "available",
    fileUrl: "/recursos-semana-2/colorear-semana-2.pdf",
  },
  verseCard: {
    title: "Versículo para llevar a casa — Semana 2",
    status: "available",
    fileUrl: "/recursos-semana-2/versiculo-semana-2.pdf",
  },
  verseRVR1960: {
    ref: "Génesis 1:26",
    text: "Entonces dijo Dios: Hagamos al hombre a nuestra imagen, conforme a nuestra semejanza; y señoree en los peces del mar, en las aves de los cielos, en las bestias, en toda la tierra, y en todo animal que se arrastra sobre la tierra.",
  },
  externalResources: [
    {
      label: "Historia adaptada de Súper Libro",
      name: '"En el principio" (CBN Superlibro, Temporada 1)',
      description:
        "El mismo episodio de la creación (Génesis) sirve para esta semana: incluye la creación del ser humano a imagen de Dios. Revísalo antes de mostrarlo.",
      url: "https://www.cbn.com/superbook/espanol/",
    },
    {
      label: "Canción de Pequeños Héroes",
      name: "Canal oficial",
      description:
        "Explora el canal de Pequeños Héroes en español y elige una canción sobre la creación o la identidad que se ajuste a tu grupo.",
      url: "https://www.youtube.com/channel/UCwnmHLNwY0WRLFqnZMMIIFQ",
    },
    {
      label: "Recurso doctrinal para el maestro",
      name: "Coalición por el Evangelio",
      description:
        "Artículos de sana doctrina en español sobre la imagen de Dios (imago Dei) y la dignidad humana.",
      url: "https://www.coalicionporelevangelio.org/",
    },
  ],
};
