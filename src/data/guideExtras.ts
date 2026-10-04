// Contenido METODOLÓGICO de la Guía del Maestro (transición, uso de los
// recursos, adaptación por edad). Se construye a partir de los recursos
// reales de cada semana (diapositivas, hoja de trabajo, versículo).
// No introduce doctrina nueva: la base doctrinal sigue saliendo de
// weeks/weekNN.ts. Los textos de esta clase de contenido que fueron
// redactados al implementar la guía están marcados para revisión pastoral
// en docs/PENDIENTES_PROXIMAS_FASES.md.

export interface AgeAdaptationWeek {
  activity: string;
  questions: string;
}

export interface GuideExtras {
  memoryPhrase: string;
  transition: string;
  slides: {
    title: string;
    initialQuestion: string;
    mainIdea: string;
    teachingTitle: string;
    teachingItems: string[];
    bigLine: string;
    participation: string;
    activity: string;
    closingPrayer: string;
  };
  worksheet: { activities: string[]; answerKey: string[] };
  ages: { a35: AgeAdaptationWeek; a57: AgeAdaptationWeek; a810: AgeAdaptationWeek };
}

/** Parte de la adaptación por edad que es igual en todas las semanas. */
export const AGE_BASE = {
  a35: {
    label: "3 a 5 años",
    language: "Frases cortas y concretas, una sola idea a la vez, con gestos y repetición.",
    duration:
      "Atención limitada: reparte la enseñanza en bloques de 5 a 7 minutos y alterna con movimiento o canto.",
    participation: "Respuestas cortas o con gestos; participación por turnos y en grupo.",
  },
  a57: {
    label: "5 a 7 años",
    language: "Oraciones sencillas con ejemplos de su vida diaria.",
    duration: "Se mantiene la estructura completa de 60 minutos.",
    participation: "Responden por turnos, completan frases y pueden dibujar o escribir palabras.",
  },
  a810: {
    label: "8 a 10 años",
    language: "Lenguaje directo; pueden seguir la lectura del texto bíblico en su propia Biblia.",
    duration: "60 minutos con margen para conversar y explicar con sus palabras.",
    participation: "Conversan, justifican sus respuestas y pueden ayudar a los niños menores.",
  },
};

export const GUIDE_EXTRAS: Record<number, GuideExtras> = {
  1: {
    memoryPhrase: "Dios me hizo.",
    transition:
      "Cuando termines de narrar Génesis 1:26–31 y 2:7, ayuda a los niños a pasar de escuchar a participar: «Dios nos hizo a propósito. Ahora vamos a decir algo que nos gusta de cómo Dios nos hizo.» Cierra el momento de enseñanza con una oración corta de agradecimiento y pasa a la dinámica «Yo fui hecho a propósito».",
    slides: {
      title: "¡Dios me creó!",
      initialQuestion: "¿Sabes quién te hizo?",
      mainIdea: "Antes de que existiera algo... ¡solo existía Dios!",
      teachingTitle: "Dios hizo todo lo que existe",
      teachingItems: ["El cielo", "Las plantas", "Los animales"],
      bigLine: "Y luego, Dios te hizo a ti — ¡con propósito!",
      participation: "¿Qué cosas hizo Dios que puedes ver ahora mismo?",
      activity: "Dibuja algo que Dios hizo, y algo que Dios te dio a ti.",
      closingPrayer: "Gracias, Dios, porque tú me hiciste.",
    },
    worksheet: {
      activities: [
        "Actividad 1 — Completar frases con el banco de palabras (creó, propósito, accidente).",
        "Actividad 2 — Marcar Verdadero o Falso en tres afirmaciones sobre la creación.",
        "Actividad 3 — Escribir qué le gusta de cómo Dios lo hizo.",
        "Actividad 4 — Dibujarse a sí mismo.",
      ],
      answerKey: [
        "Actividad 1: «Dios me creó a mí, con propósito. No fui hecho por accidente.»",
        "Actividad 2: Verdadero, Falso, Verdadero.",
        "Actividades 3 y 4: respuesta personal (no hay respuesta incorrecta).",
      ],
    },
    ages: {
      a35: {
        activity: "Dibujar o señalar algo que Dios hizo; hoja para colorear «Dios me creó».",
        questions: "¿Quién te hizo? ¿Dios hizo el sol? ¿Dios te hizo a ti?",
      },
      a57: {
        activity:
          "Dinámica «Yo fui hecho a propósito» y hoja de trabajo (completar frases y Verdadero/Falso con ayuda del maestro).",
        questions: "¿Qué hizo Dios? ¿Fuiste un accidente o Dios te hizo a propósito?",
      },
      a810: {
        activity:
          "Leer Génesis 1:26–31 y 2:7 en su Biblia y comparar cómo se describe la creación del ser humano; hoja de trabajo completa de forma independiente.",
        questions:
          "¿Qué muestra la palabra «Hagamos» sobre cómo Dios creó al ser humano? ¿Qué dos elementos menciona Génesis 2:7?",
      },
    },
  },
  2: {
    memoryPhrase: "Llevo la imagen de Dios.",
    transition:
      "Al terminar de leer Génesis 1:26–27 y 5:1–2 y de explicar la palabra «imagen», pasa a la dinámica con una frase puente: «Reflejamos algo de Dios sin ser Dios. Vamos a jugar a reflejar a nuestro compañero.» Conduce la dinámica «Espejo humano» y luego retoma la conversación sobre cómo tratar a los demás.",
    slides: {
      title: "¡Llevo la imagen de Dios!",
      initialQuestion: "¿Te has visto en un espejo hoy?",
      mainIdea: "Dios te hizo para que te parezcas a Él... ¡Llevas Su imagen!",
      teachingTitle: "Llevar la imagen de Dios significa que puedes...",
      teachingItems: ["Amar", "Pensar y crear", "Cuidar lo que Dios hizo"],
      bigLine: "Cada persona que conoces también lleva la imagen de Dios.",
      participation: "¿Qué puedes hacer tú que un animal no puede hacer?",
      activity:
        "Dibújate frente a un espejo, y escribe algo bueno que puedes hacer porque llevas la imagen de Dios.",
      closingPrayer: "Gracias, Dios, por hacerme a tu imagen.",
    },
    worksheet: {
      activities: [
        "Actividad 1 — Completar frases con el banco de palabras (imagen, reflejo, todas).",
        "Actividad 2 — Relacionar «Dios ama / piensa / crea / cuida» con lo que el niño puede hacer.",
        "Actividad 3 — Marcar la respuesta correcta sobre qué significa ser imagen de Dios.",
        "Actividad 4 — Dibujarse frente a un espejo.",
      ],
      answerKey: [
        "Actividad 1: «Fui creado a imagen de Dios. Todas las personas llevan la imagen de Dios.»",
        "Actividad 2: cada acción de Dios se une con su correspondiente («Dios ama» con «Yo puedo amar a otros», etc.).",
        "Actividad 3: respuesta b) «Parecido a Dios, sin ser Dios».",
        "Actividad 4: respuesta personal.",
      ],
    },
    ages: {
      a35: {
        activity: "Mirarse en un espejo y decir «Llevo la imagen de Dios»; hoja para colorear.",
        questions: "¿Dios te hizo a ti? ¿Dios hizo también a tu amigo?",
      },
      a57: {
        activity: "Dinámica «Espejo humano» y hoja de trabajo (relacionar columnas).",
        questions: "¿Qué puedes hacer tú que un animal no puede hacer? ¿Todas las personas llevan la imagen de Dios?",
      },
      a810: {
        activity:
          "Leer Génesis 1:26–27 y 5:1–2 y explicar con sus palabras la diferencia entre «parecerse a Dios» e «igualar a Dios».",
        questions:
          "¿Por qué Génesis 5 vuelve a mencionar la imagen de Dios? ¿Qué cambia en cómo trato a los demás?",
      },
    },
  },
  3: {
    memoryPhrase: "Dios me conoce.",
    transition:
      "Después de leer el Salmo 139 con asombro, haz una pausa breve en silencio y di: «David se sintió conocido y cuidado por Dios. Vamos a jugar a conocernos un poco más.» Así pasas a la dinámica «¿Me conoces?» y después conectas con que Dios nos conoce todavía más, con cuidado.",
    slides: {
      title: "Dios me conoce",
      initialQuestion: "¿Quién crees que te conoce mejor que nadie?",
      mainIdea: "Dios te conoce desde... ¡antes de que nacieras!",
      teachingTitle: "Dios conoce...",
      teachingItems: ["Tus pensamientos", "Cómo caminas", "Lo que vas a decir"],
      bigLine: "Dios te conoce por completo, y te formó con cuidado.",
      participation: "¿Qué es algo que te gusta, y que Dios ya sabía que te iba a gustar?",
      activity: "Completa tu tarjeta con tu nombre y algo que te gusta — ¡Dios ya lo sabía!",
      closingPrayer: "Gracias, Dios, porque me conoces por completo.",
    },
    worksheet: {
      activities: [
        "Actividad 1 — Completar frases con el banco de palabras (naciera, cuidado, pensamientos).",
        "Actividad 2 — Escribir tres cosas que le gustan.",
        "Actividad 3 — Marcar Verdadero o Falso sobre el Salmo 139.",
        "Actividad 4 — Relacionar «formidable» y «entretejer» con su significado.",
      ],
      answerKey: [
        "Actividad 1: «…antes de que yo naciera.» «…con cuidado.» «…mis pensamientos…»",
        "Actividad 2: respuesta personal.",
        "Actividad 3: Falso, Verdadero, Verdadero.",
        "Actividad 4: «Formidable» con «Algo asombroso y admirable»; «Entretejer» con «Formar con cuidado, como hilos».",
      ],
    },
    ages: {
      a35: {
        activity: "Decir su nombre y una cosa que le gusta; hoja para colorear «Dios me conoce».",
        questions: "¿Dios conoce tu nombre? ¿Dios está cerca de ti?",
      },
      a57: {
        activity: "Dinámica «¿Me conoces?», tarjeta «Dios me conoce» y hoja de trabajo.",
        questions: "¿Quién te conoce muy bien? ¿Dios te conoce todavía más?",
      },
      a810: {
        activity:
          "Leer Salmo 139:1–6 y 13–16 y subrayar qué cosas conoce Dios; hoja de trabajo con relación de palabras.",
        questions: "¿Qué expresa David: temor o asombro? ¿Qué significa «entretejer»?",
      },
    },
  },
  4: {
    memoryPhrase: "Mi valor viene de Dios.",
    transition:
      "Cuando hayas leído Mateo 10:29–31 y repasado las semanas anteriores, haz la transición con una pregunta: «¿Cuánto vale algo precioso para ti?» Esto abre la dinámica «Más valioso que...», que culmina con la pregunta: «¿Y cuánto vales tú para Dios?»",
    slides: {
      title: "Mi vida tiene valor",
      initialQuestion: "¿Alguna vez sentiste que valías menos porque algo no te salió bien?",
      mainIdea: "Jesús dijo que cuidamos hasta a los pajarillos... ¡Tú vales mucho más!",
      teachingTitle: "Recordemos lo que aprendimos:",
      teachingItems: ["Dios me creó", "A su imagen", "Y me conoce"],
      bigLine: "Tu valor viene de Dios, no de lo que haces.",
      participation: "Si Dios cuida hasta de los pajarillos pequeños, ¿cómo crees que te cuida a ti?",
      activity: "Haz tu manualidad «Mi valor» y comparte algo que aprendiste sobre tu valor.",
      closingPrayer: "Gracias, Dios, porque mi valor viene de ti.",
    },
    worksheet: {
      activities: [
        "Actividad 1 — Completar frases con el banco de palabras (creó, conoce, pajarillos).",
        "Actividad 2 — Marcar Verdadero o Falso sobre de dónde viene el valor.",
        "Actividad 3 — Escribir qué le diría a un amigo que siente que «no vale nada».",
        "Actividad 4 — Repaso del Módulo 1: relacionar cada semana con su verdad.",
      ],
      answerKey: [
        "Actividad 1: «Tengo valor porque Dios me creó y me conoce. Valgo más que muchos pajarillos.»",
        "Actividad 2: Falso, Verdadero, Verdadero.",
        "Actividad 3: respuesta personal; busca que mencione que el valor viene de Dios.",
        "Actividad 4: Semana 1 con «Dios me creó», Semana 2 con «Llevo la imagen de Dios», Semana 3 con «Dios me conoce», Semana 4 con «Tengo valor».",
      ],
    },
    ages: {
      a35: {
        activity: "Mostrar un objeto brillante y decir «¡Tú vales mucho!»; hoja para colorear.",
        questions: "¿Dios cuida a los pajarillos? ¿Dios te cuida a ti?",
      },
      a57: {
        activity: "Dinámica «Más valioso que...», manualidad «Mi valor» y hoja de trabajo.",
        questions: "¿Tu valor cambia si sacas una mala nota? ¿De dónde viene tu valor?",
      },
      a810: {
        activity: "Leer Mateo 10:29–31 y relacionarlo con las semanas 1 a 3; hoja de trabajo de repaso del módulo.",
        questions:
          "¿Cómo se conectan creación, imagen y conocimiento de Dios con el valor de una persona? ¿Qué le dirías a un amigo que siente que no vale nada?",
      },
    },
  },
};

export function getGuideExtras(week: number): GuideExtras | undefined {
  return GUIDE_EXTRAS[week];
}
