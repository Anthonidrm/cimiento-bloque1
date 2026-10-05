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
const { resolveWeights } = await import("../../src/config/preparationConfig");
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

console.log("2) Pesos: guía 50 · examen 30 · presentación 20");
const w = resolveWeights();
ok(w.guide === 50 && w.exam === 30 && w.presentation === 20, `Pesos ${w.guide}/${w.exam}/${w.presentation}`);
store.clear(); await login("lela");
ok(P.computePreparation(1).percent === 0, "Sin hacer nada: 0 %");
let gp = G.loadProgress(1);
for (let n = 1; n <= 12; n++) { gp = G.openSection(gp, n, "t"); gp = G.addSeconds(gp, n, 30, "t"); }
G.saveProgress(gp);
const gc = P.computePreparation(1).components.find((c) => c.key === "guide")!;
ok(Math.abs(gc.earned - (12 / 23) * 50) < 0.001, `La guía NO se regala: 12 de 23 apartados = ${gc.earned.toFixed(1)} de 50`);

console.log("3) Presentación: uso real, no un clic");
ok(P.computePreparation(1).components.find((c) => c.key === "presentation")!.earned === 0, "Sin proyectar nada: 0 de 20");
for (let sl = 1; sl <= 4; sl++) PR.addSlideSeconds(1, sl, PRESENTATION_CONFIG.minSecondsPerSlide);
PR.addSlideSeconds(1, 5, PRESENTATION_CONFIG.minSecondsPerSlide - 1);
const pc = P.computePreparation(1).components.find((c) => c.key === "presentation")!;
ok(Math.abs(pc.earned - (4 / 9) * 20) < 0.001, `4 de 9 diapositivas con ≥ ${PRESENTATION_CONFIG.minSecondsPerSlide} s = ${pc.earned.toFixed(1)} de 20 (la de 4 s no cuenta)`);
for (let sl = 1; sl <= 9; sl++) PR.addSlideSeconds(1, sl, PRESENTATION_CONFIG.minSecondsPerSlide);
ok(P.computePreparation(1).components.find((c) => c.key === "presentation")!.earned === 20, "Las 9 diapositivas: 20 de 20");

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
ok(E.getExamScore(1, 9) === 89 && P.computePreparation(1).components.find((c) => c.key === "exam")!.earned === (89 / 100) * 30, "El examen aporta 89 % de 30 puntos");
ok(!E.answerQuestion(1, q1, { optionId: q1.correctOptionId }).ok, "Tras terminar el intento ya no se acepta nada");
ok(E.canStartNewAttempt(1) && EXAM_CONFIG.maxAttempts === 2, "Queda 1 intento disponible (configurable)");
E.startAttempt(1);
for (const q of qs) {
  if (q.type === "matching") E.answerQuestion(1, q, { pairs: Object.fromEntries(q.pairs!.map((x) => [x.left, x.right])) });
  else E.answerQuestion(1, q, { optionId: q.correctOptionId });
}
ok(E.getExamState(1).attempts.length === 2 && !E.canStartNewAttempt(1), "Con 2 intentos usados no se permite un tercero");
ok(E.getExamScore(1, 9) === 100, "Política 'best': cuenta el mejor intento (100 %)");
ok(E.getAllMissedAttempts(1).length === 1, "El error del intento 1 permanece en el historial de errores");
const m = E.getQuestionSummaries(1).find((s) => s.questionId === q1.id)!;
ok(m.totalAttempts === 2 && m.currentlyCorrect && m.missedAttempts.length === 1, "Resumen: 2 intentos, corregida después, 1 error registrado");
ok(E.getExamState(1).scoreHistory.length === 18, "Se guarda la puntuación tras cada respuesta (18)");
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

done();
