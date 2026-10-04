// Configuración del porcentaje de preparación del maestro.
//
// DEFINIDO por el propietario:
//   - Examen del maestro ........ 30 %
//   - Uso de la presentación .... 20 %
// PENDIENTE de definir:
//   - El 50 % restante corresponde a "preparación y actividades
//     obligatorias". NO se ha definido cómo se reparte.
//
// Por eso el reparto del 50 % restante es una configuración: se expresa como
// proporciones entre componentes. Mientras "mandatoryActivities" no tenga
// actividades definidas, su proporción es 0 y toda la bolsa restante la
// recibe provisionalmente la lectura de la guía. Para cambiarlo basta con
// editar `remainingSplit`.
export const PREPARATION_CONFIG = {
  exam: 30,
  presentation: 20,
  remainingPool: 50,
  remainingSplit: {
    guide: 1,
    mandatoryActivities: 0,
  },
  remainingIsProvisional: true,
} as const;

export function resolveWeights() {
  const { exam, presentation, remainingPool, remainingSplit } = PREPARATION_CONFIG;
  const total = remainingSplit.guide + remainingSplit.mandatoryActivities;
  const share = (n: number) => (total === 0 ? 0 : (remainingPool * n) / total);
  return {
    exam,
    presentation,
    guide: share(remainingSplit.guide),
    mandatoryActivities: share(remainingSplit.mandatoryActivities),
  };
}
