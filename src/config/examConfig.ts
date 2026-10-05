// Configuración del examen del maestro.
//
// maxAttempts: cuántas veces puede realizar el examen completo (cada intento
//   queda registrado con sus respuestas).
// scoring: qué intento define la calificación que cuenta para la preparación:
//   "first"  → el primer intento completado (el más estricto)
//   "best"   → el mejor intento completado
//   "latest" → el último intento completado
// Dentro de un intento, la primera respuesta a cada pregunta queda registrada
// y NO se puede cambiar.
export const EXAM_CONFIG: { maxAttempts: number; scoring: "first" | "best" | "latest" } = {
  maxAttempts: 2,
  scoring: "best",
};
