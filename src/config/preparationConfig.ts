// Pesos del porcentaje de preparación del maestro (suman EXACTAMENTE 100 %).
//   Guía del Maestro ............ 45 %  → proporcional a los apartados realmente completados
//   Examen del maestro .......... 25 %  → según la calificación de su único intento (ver config/examConfig.ts)
//   Presentación ................ 15 %  → proporcional a las diapositivas realmente proyectadas
//   Actividades obligatorias .... 15 %  → las DOS actividades obligatorias del maestro (ver MANDATORY_SPLIT):
//                                         1) inicio y finalización de clase  2) pase de lista
//                                         (NO son actividades de estudiantes ni de integración)
// Debe coincidir con app_config.prep_weights / prep_mandatory_split del servidor (migraciones 0006 y 0007); la base de datos
// también exige que sumen 100.
export const PREPARATION_CONFIG = {
  guide: 45,
  exam: 25,
  presentation: 15,
  mandatoryActivities: 15,
} as const;

/** Reparto del peso de las actividades obligatorias entre las dos actividades del maestro (suma 100). */
export const MANDATORY_SPLIT = { class: 50, attendance: 50 } as const;

export const PREPARATION_TOTAL =
  PREPARATION_CONFIG.guide + PREPARATION_CONFIG.exam + PREPARATION_CONFIG.presentation + PREPARATION_CONFIG.mandatoryActivities;

if (PREPARATION_TOTAL !== 100) throw new Error(`Los pesos de preparación deben sumar exactamente 100 (suman ${PREPARATION_TOTAL}).`);
if (MANDATORY_SPLIT.class + MANDATORY_SPLIT.attendance !== 100) throw new Error("El reparto de las actividades obligatorias debe sumar 100.");

export function resolveWeights() {
  const { guide, exam, presentation, mandatoryActivities } = PREPARATION_CONFIG;
  return { guide, exam, presentation, mandatoryActivities };
}
