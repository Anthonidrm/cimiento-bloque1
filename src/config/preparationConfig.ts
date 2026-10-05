// Pesos del porcentaje de preparación del maestro (suman 100 %).
//   Guía del Maestro ........ 50 %  → proporcional a los apartados realmente completados
//   Examen del maestro ...... 30 %  → según la calificación (ver config/examConfig.ts)
//   Presentación ............ 20 %  → proporcional a las diapositivas realmente proyectadas
//   Actividades obligatorias   0 %  → se integrarán cuando se defina su estructura
export const PREPARATION_CONFIG = {
  guide: 50,
  exam: 30,
  presentation: 20,
  mandatoryActivities: 0,
  mandatoryActivitiesPending: true,
} as const;

export function resolveWeights() {
  const { guide, exam, presentation, mandatoryActivities } = PREPARATION_CONFIG;
  return { guide, exam, presentation, mandatoryActivities };
}
