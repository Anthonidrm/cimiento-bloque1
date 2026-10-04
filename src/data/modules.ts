// Los 12 temas originales de CIMIENTO son los 12 MÓDULOS doctrinales del
// programa anual — NO representan 12 semanas. El programa completo es de
// 52 semanas, organizadas dentro de estos 12 módulos. Distribución
// definitiva aprobada por el cliente.
export interface Module {
  id: number;
  title: string;
  weekStart: number;
  weekEnd: number;
}

export const modules: Module[] = [
  { id: 1, title: "Dios me creó", weekStart: 1, weekEnd: 4 },
  { id: 2, title: "Dios merece reverencia", weekStart: 5, weekEnd: 8 },
  { id: 3, title: "Dios me ama", weekStart: 9, weekEnd: 12 },
  { id: 4, title: "El pecado nos separa de Dios", weekStart: 13, weekEnd: 16 },
  { id: 5, title: "Jesús es el Salvador", weekStart: 17, weekEnd: 20 },
  { id: 6, title: "La fe en Jesús", weekStart: 21, weekEnd: 24 },
  { id: 7, title: "Obedecer por amor", weekStart: 25, weekEnd: 28 },
  { id: 8, title: "La Palabra de Dios me guía", weekStart: 29, weekEnd: 32 },
  { id: 9, title: "Puedo hablar con Dios", weekStart: 33, weekEnd: 36 },
  { id: 10, title: "Somos parte de la Iglesia", weekStart: 37, weekEnd: 40 },
  { id: 11, title: "Puedo mostrar a Jesús", weekStart: 41, weekEnd: 44 },
  { id: 12, title: "Vivo con propósito", weekStart: 45, weekEnd: 52 },
];

export function getModuleForWeek(week: number): Module | undefined {
  return modules.find((m) => week >= m.weekStart && week <= m.weekEnd);
}
