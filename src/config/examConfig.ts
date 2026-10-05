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
// DECISIÓN CONFIRMADA: el examen del maestro tiene UN SOLO INTENTO. La primera respuesta de cada pregunta
// queda registrada definitivamente y cuenta en la calificación (también si es incorrecta).
export const EXAM_CONFIG: { maxAttempts: number; scoring: "first" | "best" | "latest" } = {
  maxAttempts: 1,
  scoring: "first",
};
