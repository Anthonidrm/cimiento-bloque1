// Pruebas de lógica: guía secuencial, examen, presentación, preparación, autenticación y acceso.
// Ejecutar desde la raíz del repo:  NODE_OPTIONS="--import ./tools/pruebas/register.mjs" npx --yes tsx --tsconfig tsconfig.app.json tools/pruebas/logica.ts
import { store, ok, done } from "./shim";

const { buildGuideSections, GUIDE_SECTION_TITLES } = await import("../../src/data/guideSections");
const { getWeek } = await import("../../src/data/weeks");
const G = await import("../../src/services/guidePrepService");
const P = await import("../../src/services/preparationService");
const E = await import("../../src/services/examService");
const PR = await import("../../src/services/presentationService");
const A = await import("../../src/auth/authService");
const { resolveWeights, PREPARATION_TOTAL } = await import("../../src/config/preparationConfig");
const MS = await import("../../src/services/mandatoryService");
const { EXAM_CONFIG } = await import("../../src/config/examConfig");
const { PRESENTATION_CONFIG } = await import("../../src/config/presentationConfig");
const { layoutRedirect, landingFor } = await import("../../src/auth/landing");

const login = async (id: string) => {            // sesión de prueba sin usar contraseñas reales
  await A.setNewPassword(id, "ClaveDePrueba#1");
  const r = await A.login(id, "ClaveDePrueba#1");
  if (!r.ok) throw new Error("no se pudo iniciar sesión de prueba");
};

console.log("1) Guía: 23 apartados y desbloqueo secuencial (30 s)");
for (const n of [1, 2, 3, 4]) {
  const secs = buildGuideSections(getWeek(n)!);
  ok(secs.length === 23 && secs.every((s, i) => s.title === GUIDE_SECTION_TITLES[i] && s.blocks.length > 0), `Semana ${n}: 23 apartados con contenido, en orden`);
}
let p = G.emptyProgress("t", 1);
ok(G.isUnlocked(p, 1) && !G.isUnlocked(p, 2), "Solo el apartado 1 está activo al comenzar");
p = G.openSection(p, 1, "t"); p = G.addSeconds(p, 1, 29, "t");
ok(!G.isUnlocked(p, 2), "A los 29 s el apartado 2 sigue bloqueado");
p = G.addSeconds(p, 1, 1, "t");
ok(G.isUnlocked(p, 2) && G.isOpened(p, 1), "A los 30 s se desbloquea el 2 y el 1 permanece desplegado");

console.log("2) Pesos: guía 45 · examen 25 · presentación 15 · actividades obligatorias 15 (= 100)");
const w = resolveWeights();
ok(w.guide === 45 && w.exam === 25 && w.presentation === 15 && w.mandatoryActivities === 15, `Pesos ${w.guide}/${w.exam}/${w.presentation}/${w.mandatoryActivities}`);
ok(w.guide + w.exam + w.presentation + w.mandatoryActivities === 100 && PREPARATION_TOTAL === 100, "Los pesos suman EXACTAMENTE 100");
ok(P.computePreparation(1, "nadie").components.reduce((a, c) => a + c.weight, 0) === 100, "Los componentes mostrados suman 100 puntos máximos");
store.clear(); await login("lela");
ok(P.computePreparation(1).percent === 0, "Sin hacer nada: 0 % (ningún componente se regala)");
let gp = G.loadProgress(1);
for (let n = 1; n <= 12; n++) { gp = G.openSection(gp, n, "t"); gp = G.addSeconds(gp, n, 30, "t"); }
G.saveProgress(gp);
const gc = P.computePreparation(1).components.find((c) => c.key === "guide")!;
ok(Math.abs(gc.earned - (12 / 23) * 45) < 0.001, `La guía NO se regala: 12 de 23 apartados = ${gc.earned.toFixed(1)} de 45`);

console.log("3) Presentación: uso real, no un clic");
ok(P.computePreparation(1).components.find((c) => c.key === "presentation")!.earned === 0, "Sin proyectar nada: 0 de 15");
for (let sl = 1; sl <= 4; sl++) PR.addSlideSeconds(1, sl, PRESENTATION_CONFIG.minSecondsPerSlide);
PR.addSlideSeconds(1, 5, PRESENTATION_CONFIG.minSecondsPerSlide - 1);
const pc = P.computePreparation(1).components.find((c) => c.key === "presentation")!;
ok(Math.abs(pc.earned - (4 / 9) * 15) < 0.001, `4 de 9 diapositivas con ≥ ${PRESENTATION_CONFIG.minSecondsPerSlide} s = ${pc.earned.toFixed(1)} de 15 (la de 4 s no cuenta)`);
for (let sl = 1; sl <= 9; sl++) PR.addSlideSeconds(1, sl, PRESENTATION_CONFIG.minSecondsPerSlide);
ok(P.computePreparation(1).components.find((c) => c.key === "presentation")!.earned === 15, "Las 9 diapositivas: 15 de 15");


console.log("3b) Actividades obligatorias DEL MAESTRO (15 %): inicio y finalización de clase + pase de lista");
store.clear(); await login("yely");
const mand = (wk = 2) => P.computePreparation(wk).components.find((c) => c.key === "mandatoryActivities")!;
ok(mand().earned === 0 && !mand().done && /Inicio y finalización de clase: pendiente/.test(mand().detail) && /Pase de lista: pendiente/.test(mand().detail), "Sin clase ni pase de lista: 0 de 15 (no se regala)");
MS.saveTeacherDuties(2, { classDone: true, attendanceDone: false });
ok(mand().earned === 7.5 && !mand().done && /clase: hecho/.test(mand().detail), "Solo inicio y finalización de clase: 7,5 de 15");
MS.saveTeacherDuties(2, { classDone: false, attendanceDone: true });
ok(mand().earned === 7.5 && /Pase de lista: hecho/.test(mand().detail), "Solo pase de lista: 7,5 de 15");
MS.saveTeacherDuties(2, { classDone: true, attendanceDone: true });
ok(mand().earned === 15 && mand().done, "Las dos actividades: 15 de 15");
store.clear(); await login("mari");
MS.saveTeacherDuties(3, { classDone: true, attendanceDone: true });
store.clear(); await login("yely");
ok(!MS.getTeacherDuties(3).classDone && !MS.getTeacherDuties(3).attendanceDone, "Lo hecho por un maestro es independiente de otro");
ok(P.computePreparation(2).components.find((c) => c.key === "mandatoryActivities")!.weight === 15, "El componente pesa 15");

console.log("3c) Preparación completa = 100 % exacto; cada componente que falta resta su peso");
const pw = getWeek(1)!;
const finishExam = () => { for (const q of pw.examQuestions) { if (q.type === "matching") E.answerQuestion(1, q, { pairs: Object.fromEntries(q.pairs!.map((x) => [x.left, x.right])) }); else E.answerQuestion(1, q, { optionId: q.correctOptionId }); } };
const finishGuide = () => { let g = G.loadProgress(1); for (let n = 1; n <= 23; n++) { g = G.openSection(g, n, "t"); g = G.addSeconds(g, n, 30, "t"); } G.saveProgress(g); };
const finishPres = () => { for (let sl = 1; sl <= 9; sl++) PR.addSlideSeconds(1, sl, PRESENTATION_CONFIG.minSecondsPerSlide); };
store.clear(); await login("nuna");
ok(P.computePreparation(1).percent === 0, "Nada hecho: 0 %");
finishGuide(); ok(P.computePreparation(1).percent === 45, "Solo la guía completa: 45 %");
finishExam(); ok(P.computePreparation(1).percent === 70, "Guía + examen perfecto: 70 %");
finishPres(); ok(P.computePreparation(1).percent === 85, "+ presentación: 85 %");
MS.saveTeacherDuties(1, { classDone: true, attendanceDone: false }); ok(P.computePreparation(1).percent === 93, "+ inicio y finalización de clase: 92,5 % (se muestra redondeado a 93)");
MS.saveTeacherDuties(1, { classDone: true, attendanceDone: true });
const full = P.computePreparation(1);
ok(full.percent === 100 && full.components.reduce((a, c) => a + c.earned, 0) === 100, "Todo completo: EXACTAMENTE 100 %");
ok(full.components.every((c) => c.done), "Todos los componentes figuran como completos");
store.clear(); await login("naty");
finishGuide(); finishExam(); finishPres();
ok(P.computePreparation(1).percent === 85, "Sin las actividades obligatorias del maestro (no dio la clase ni pasó lista): 85 %");

console.log("4) Examen: primera respuesta bloqueada, intentos, relación");
store.clear(); await login("tefa");
const wk = getWeek(1)!; const qs = wk.examQuestions;
ok(qs.length === 9 && qs.some((q) => q.type === "matching"), "Semana 1: 9 preguntas, una de relación");
const q1 = qs[0]; const wrong = q1.options.find((o) => o.id !== q1.correctOptionId)!.id;
const r1 = E.answerQuestion(1, q1, { optionId: wrong });
ok(r1.ok && !r1.record.isCorrect, "Se registra una respuesta incorrecta");
const r2 = E.answerQuestion(1, q1, { optionId: q1.correctOptionId });
ok(!r2.ok, "NO se puede cambiar la respuesta registrada");
ok(E.getExamState(1).attempts[0].answers[q1.id].selectedOptionId === wrong, "Queda registrada la PRIMERA respuesta (la incorrecta)");
for (const q of qs.slice(1)) {
  if (q.type === "matching") {
    ok(!E.answerQuestion(1, q, { pairs: {} }).ok, "La relación incompleta se rechaza");
    E.answerQuestion(1, q, { pairs: Object.fromEntries(q.pairs!.map((x) => [x.left, x.right])) });
  } else E.answerQuestion(1, q, { optionId: q.correctOptionId });
}
const a1 = E.getCurrentAttempt(1)!;
ok(!!a1.completedAt && a1.scorePercent === Math.round((8 / 9) * 100), `Intento 1 completado con 8/9 = ${a1.scorePercent}% (el error inicial cuenta)`);
ok(E.getExamScore(1, 9) === 89 && P.computePreparation(1).components.find((c) => c.key === "exam")!.earned === (89 / 100) * 25, "El examen aporta 89 % de 25 puntos");
ok(!E.answerQuestion(1, q1, { optionId: q1.correctOptionId }).ok, "Tras terminar el intento ya no se acepta nada");
ok(EXAM_CONFIG.maxAttempts === 1 && !E.canStartNewAttempt(1), "El examen tiene UN SOLO intento: no se puede iniciar otro");
ok(E.startAttempt(1) === undefined && E.getExamState(1).attempts.length === 1, "Intentar abrir un segundo intento no hace nada");
ok(E.getExamScore(1, 9) === 89, "La calificación es la del único intento (89 %), con el error inicial incluido");
ok(E.getAllMissedAttempts(1).length === 1, "El error permanece en el historial de errores");
const m = E.getQuestionSummaries(1).find((s) => s.questionId === q1.id)!;
ok(m.totalAttempts === 1 && !m.currentlyCorrect && m.missedAttempts.length === 1, "Resumen: 1 intento, pregunta incorrecta registrada");
ok(E.getExamState(1).scoreHistory.length === 9, "Se guarda la puntuación tras cada respuesta (9)");
ok(qs.filter((q) => q.type === "matching").every((q) => q.needsPastoralReview), "Las preguntas de relación están marcadas para revisión pastoral");
await login("yely");
ok(E.getExamState(1).attempts.length === 0, "El examen es independiente por usuario");
// migración del formato anterior
store.set("cimiento:exam:yely:2", JSON.stringify({ history: { "s2-q1": [{ selectedOptionId: "a", correctOptionId: "b", isCorrect: false, attemptNumber: 1, answeredAt: "2026-01-01T00:00:00Z" }, { selectedOptionId: "b", correctOptionId: "b", isCorrect: true, attemptNumber: 2, answeredAt: "2026-01-01T00:01:00Z" }] } }));
const mig = E.getExamState(2);
ok(mig.version === 2 && mig.attempts[0].answers["s2-q1"].selectedOptionId === "a", "Migración: de los datos anteriores se conserva la PRIMERA respuesta");

console.log("5) Autenticación y roles");
store.clear();
await A.setNewPassword("lela", "OtraClave#22");
ok((await A.login("Lela", "OtraClave#22")).ok, "Login por nombre de acceso");
ok(!(await A.login("lela", "incorrecta")).ok, "Contraseña incorrecta rechazada");
ok((await A.login("lela", "x") as any).error === (await A.login("noexiste", "x") as any).error, "Mensaje genérico (no revela usuarios)");
ok(!(await A.changeOwnPassword("mala", "NuevaClave#33")).ok && (await A.changeOwnPassword("OtraClave#22", "NuevaClave#33")).ok, "Cambio de contraseña exige la actual");
ok(!(await A.adminResetPassword("tefa", "ClaveNueva#44")).ok, "Un maestro no puede restablecer contraseñas");
await login("admin");
ok((await A.adminResetPassword("tefa", "ClaveNueva#44")).ok, "El administrador restablece contraseñas");
ok(!/\$|password/i.test(JSON.stringify(A.listUsers().map((u) => ({ ...u, salt: "", hash: "" })))), "Los datos de usuarios no contienen contraseñas");

console.log("6) Acceso: login primero y permisos por rol");
ok(layoutRedirect(undefined, "/") === "/login", "Visitante en '/' → login");
for (const r of ["/plan-anual", "/plan-anual/semana-1", "/plan-anual/semana-1/guia", "/plan-anual/semana-1/examen", "/plan-anual/semana-1/presentacion", "/mi-progreso", "/maestros", "/recursos", "/administracion", "/pastor", "/estudiante", "/cuenta"])
  ok(layoutRedirect(undefined, r) === `/login?next=${encodeURIComponent(r)}`, `Visitante en ${r} → login (recordando la ruta)`);
ok(layoutRedirect(undefined, "/login") === null && layoutRedirect(undefined, "/sobre-cimiento") === null, "Solo /login y /sobre-cimiento son públicas");
ok(layoutRedirect(undefined, "/plan-anual/") === "/login?next=%2Fplan-anual", "La barra final no evade el bloqueo");
for (const r of ["/", "/plan-anual", "/maestros", "/administracion", "/pastor", "/plan-anual/semana-1/guia"])
  ok(layoutRedirect("ESTUDIANTE", r) === "/estudiante", `Estudiante en ${r} → su área`);
ok(layoutRedirect("ESTUDIANTE", "/estudiante") === null && layoutRedirect("ESTUDIANTE", "/cuenta") === null, "Estudiante sí entra a su área y su cuenta");
ok(layoutRedirect("MAESTRO", "/plan-anual") === null, "Un maestro autenticado pasa");
ok(landingFor("ADMINISTRADOR") === "/administracion" && landingFor("PASTOR") === "/pastor" && landingFor("MAESTRO") === "/maestros" && landingFor("ESTUDIANTE") === "/estudiante", "Cada rol entra a su área");

console.log("7) Juegos del estudiante (lógica pura, con el versículo real)");
const GL = await import("../../src/games/logic");
const verse = getWeek(1)!.verseRVR1960.text;
const ws = GL.words(verse);
ok(GL.scoreOrder(ws, verse) === 100, "Ordenar: el orden correcto da 100");
ok(GL.scoreOrder([...ws].reverse(), verse) < 50, "Ordenar: al revés da poco");
for (const wk of [1, 2, 3, 4]) { const sh = GL.shuffled(GL.words(getWeek(wk)!.verseRVR1960.text), wk * 7919); ok(sh.join(" ") !== GL.words(getWeek(wk)!.verseRVR1960.text).join(" "), `Semana ${wk}: las palabras se desordenan de verdad`); }
ok(GL.shuffled(ws, 5).join() === GL.shuffled(ws, 5).join(), "El desorden es estable (misma semilla, mismo orden)");
ok(GL.norm("Creó,") === "creo" && GL.norm("IMAGEN") === "imagen", "Comparar ignora mayúsculas, acentos y signos");
ok(GL.scoreBlanks(["Dios"], "Y creó Dios al hombre", [2]) === 100 && GL.scoreBlanks(["dios!"], "Y creó Dios al hombre", [2]) === 100 && GL.scoreBlanks(["Cristo"], "Y creó Dios al hombre", [2]) === 0, "Completar: acierta aunque cambien mayúsculas o signos; falla si la palabra es otra");
ok(GL.scoreBlanks(["Dios", "x"], "Y creó Dios al hombre", [2, 3]) === 50, "Completar: la mitad correcta da 50");
done();
