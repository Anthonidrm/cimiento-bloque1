// Pesos del porcentaje de preparación del maestro (suman EXACTAMENTE 100 %).
//   Guía del Maestro ............ 45 %  → proporcional a los apartados realmente completados
//   Examen del maestro .......... 25 %  → según la calificación de su único intento (ver config/examConfig.ts)
//   Presentación ................ 15 %  → proporcional a las diapositivas realmente proyectadas
//   Actividades obligatorias .... 15 %  → proporcional a las actividades de la lección que el maestro registró en clase;
//                                         si la lección no tiene actividades obligatorias definidas, se otorga completo
// Debe coincidir con app_config.prep_weights del servidor (migración 0006); la base de datos también exige que sumen 100.
export const PREPARATION_CONFIG = {
  guide: 45,
  exam: 25,
  presentation: 15,
  mandatoryActivities: 15,
} as const;

export const PREPARATION_TOTAL =
  PREPARATION_CONFIG.guide + PREPARATION_CONFIG.exam + PREPARATION_CONFIG.presentation + PREPARATION_CONFIG.mandatoryActivities;

if (PREPARATION_TOTAL !== 100) {
  throw new Error(`Los pesos de preparación deben sumar exactamente 100 (suman ${PREPARATION_TOTAL}).`);
}

export function resolveWeights() {
  const { guide, exam, presentation, mandatoryActivities } = PREPARATION_CONFIG;
  return { guide, exam, presentation, mandatoryActivities };
}
