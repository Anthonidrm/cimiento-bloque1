// Prueba de INTEGRACIÓN: los repositorios reales de src/backend usan supabase-js contra PostgREST + PostgreSQL,
// con los permisos reales (cada actor con su propio JWT). NO prueba Supabase Auth, Storage ni Edge Functions.
// Preparar y ejecutar desde la raíz:
//   WITH_USERS=1 supabase/tests/harness.sh up && npx tsx --tsconfig tsconfig.app.json tools/pruebas/backend.ts
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { ok, done } from "./shim";

const { setClientForTests } = await import("../../src/backend/client");
const T = await import("../../src/backend/teaching");
const P = await import("../../src/backend/prep");
const C = await import("../../src/backend/classes");
const S = await import("../../src/backend/students");
const H = await import("../../src/backend/people");
const R = await import("../../src/backend/resources");
const { getWeek } = await import("../../src/data/weeks");

const SECRET = "cimiento-local-test-secret-0123456789abcdef", URL = "http://127.0.0.1:54321";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (claims: object) => { const h = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 })}`; return `${h}.${createHmac("sha256", SECRET).update(h).digest("base64url")}`; };
const ID = { admin: 1, pastor: 2, lela: 3, tefa: 4, est1: 5, est2: 6 } as const;
const uid = (n: number) => `a0000000-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`;
const as = (who: keyof typeof ID | "anon") => {
  const token = who === "anon" ? jwt({ role: "anon" }) : jwt({ sub: uid(ID[who]), role: "authenticated", aud: "authenticated" });
  setClientForTests(createClient(URL, jwt({ role: "anon" }), { accessToken: async () => token, auth: { persistSession: false } }));
};
const fails = async (f: () => Promise<unknown>) => { try { await f(); return false; } catch { return true; } };

console.log("1) Perfiles y acceso");
as("admin"); ok((await H.getMyProfile())?.role === "ADMINISTRADOR" && (await H.listProfiles()).length === 6, "Administrador: su perfil y los 6 usuarios");
as("pastor"); ok((await H.listProfiles()).length === 6, "Pastor: ve a los usuarios (solo lectura)");
ok(await fails(() => H.adminCreateUser({ username: "x", displayName: "x", role: "MAESTRO", password: "abcdef" })), "La administración de usuarios exige la función del servidor (no existe en el entorno local)");
as("est1"); ok((await H.listProfiles()).length === 1, "Estudiante: solo ve su perfil");
as("lela"); ok((await H.listProfiles("ESTUDIANTE")).length === 2, "Maestro: ve a SUS estudiantes");
as("tefa"); ok((await H.listProfiles("ESTUDIANTE")).length === 0, "Otro maestro: no ve estudiantes ajenos");
as("anon"); ok(await fails(() => H.listProfiles()), "Anónimo: sin acceso");

console.log("2) Asignación de maestros");
as("pastor");
await T.assignTeacher(1, uid(3)); await T.assignTeacher(2, uid(4)); await T.assignTeacher(3, uid(4));
let lessons = await T.listLessons();
ok(lessons.length === 52 && lessons[0].teacher_name === "Lela" && lessons[0].module_title === "Dios me creó" && lessons[0].title === "Dios me creó", "Cada lección muestra su MAESTRO ASIGNADO y su módulo");
await T.assignTeacher(3, uid(3)); await T.unassignTeacher(3);
ok((await T.listLessons())[2].teacher_name === null, "Cambiar y quitar maestro");
ok((await T.assignmentHistory(3)).map((h) => h.action).join() === "QUITADO,CAMBIADO,ASIGNADO", "El historial registra ASIGNADO, CAMBIADO y QUITADO");
ok(await fails(() => T.assignTeacher(4, uid(5))), "No se puede asignar a un estudiante");
as("lela"); ok(await fails(() => T.assignTeacher(5, uid(3))), "Un maestro NO asigna lecciones");
as("est1"); ok((await T.listLessons())[0].teacher_name === "Lela", "El estudiante ve el maestro asignado");

console.log("3) Preparación y examen (el servidor califica)");
as("lela");
ok(await fails(() => P.guideAddSeconds(1, 2, 5)), "Guía: no se salta el apartado 1");
await P.guideAddSeconds(1, 1, 29); const g = await P.guideAddSeconds(1, 1, 1);
ok(g.completed && g.sections_done === 1 && (await P.guideAddSeconds(1, 2, 3)).sections_done === 1, "Guía: a los 30 s se completa y se abre el siguiente");
for (let s = 1; s <= 4; s++) await P.presentationAddSeconds(1, s, 5);
const w1 = getWeek(1)!; const first = w1.examQuestions[0]; const wrong = first.options.find((o) => o.id !== first.correctOptionId)!.id;
let r = await P.examAnswer(1, first.id, wrong);
ok(!r.is_correct && r.correct_option === first.correctOptionId, "La respuesta incorrecta se califica en el servidor y se devuelve la correcta");
ok(await fails(() => P.examAnswer(1, first.id, first.correctOptionId)), "No se puede cambiar la primera respuesta");
for (const q of w1.examQuestions.slice(1)) r = q.type === "matching" ? await P.examAnswer(1, q.id, undefined, Object.fromEntries(q.pairs!.map((p) => [p.left, p.right]))) : await P.examAnswer(1, q.id, q.correctOptionId);
ok(r.completed && r.score_percent === 89, "Único intento terminado: 8 de 9 = 89 % (el error inicial cuenta)");
ok(await fails(() => P.examAnswer(1, first.id, first.correctOptionId)), "Terminado, no hay segundo intento");
const ex = await P.myExam(1); ok(ex.answers.length === 9 && ex.answers.filter((a) => !a.is_correct).length === 1 && ex.attempt?.score_percent === 89, "Quedan registradas las respuestas con su corrección y la puntuación");
const { createClient: cc } = await import("@supabase/supabase-js");
ok((await cc(URL, jwt({ role: "anon" }), { accessToken: async () => jwt({ sub: uid(3), role: "authenticated", aud: "authenticated" }) }).from("exam_questions").select("*")).data?.length === 0, "El maestro NO puede leer las claves del examen");
ok((await (await cc(URL, jwt({ role: "anon" }), { accessToken: async () => jwt({ sub: uid(3), role: "authenticated", aud: "authenticated" }) }).from("exam_answers").insert({ attempt_id: ex.attempt!.id, question_id: "x", is_correct: true })).error) !== null, "El maestro NO escribe respuestas directamente");
const prep = await P.myPrep(uid(3), 1);
ok(prep.guide_pts === 2.2 && prep.exam_pts === 26.7 && prep.presentation_pts === 8.9, `Preparación: guía ${prep.guide_pts} + examen ${prep.exam_pts} + presentación ${prep.presentation_pts} = ${prep.total_pts}`);
as("pastor"); const tp = await T.teacherProgress();
ok(tp.some((x) => x.teacher_name === "Lela" && x.week === 1 && Number(x.total_pts) === Number(prep.total_pts) && x.exam_completed), "El Pastor ve el progreso del maestro (preparación, examen, presentación)");
as("tefa"); ok((await T.teacherProgress()).every((x) => x.teacher_name === "Tefa"), "Un maestro solo ve SU progreso");

console.log("4) Clase, pase de lista, puntuación e informe");
as("lela"); ok(await fails(() => C.startClass(1, "d0000000-0000-0000-0000-000000000001")), "El maestro asignado SIN preparación completa no inicia la clase");
as("tefa"); ok(await fails(() => C.startClass(1)), "Un maestro NO asignado no inicia la clase");
as("pastor"); const sid = await C.startClass(1, "d0000000-0000-0000-0000-000000000001");
ok(!!sid && (await C.openSession(1))?.status === "EN_CURSO", "El Pastor inicia la clase como excepción");
as("lela");
await C.markAttendance(sid, uid(5), "PRESENTE"); await C.markAttendance(sid, uid(6), "AUSENTE");
await C.markAttendance(sid, uid(6), "EXCUSA");
ok((await C.listAttendance(sid)).find((a) => a.student_id === uid(6))?.status === "EXCUSA", "Pase de lista: se puede corregir (AUSENTE → EXCUSA)");
await C.logEvent(sid, "ACTIVIDAD", { nombre: "Dinámica Yo fui hecho a propósito" }); await C.addNote(sid, "Excelente participación.");
await P.presentationAddSeconds(1, 5, 6, sid);
as("est1"); ok(await fails(() => C.logEvent(sid, "NOTA")), "Un estudiante no registra eventos de clase");
ok(Number((await S.myScores())[0].attendance_pts) === 25, "La asistencia alimenta la puntuación (PRESENTE = 25)");
as("est2"); ok(Number((await S.myScores())[0].attendance_pts) === 0 && (await S.myScores()).length === 1, "EXCUSA = 0 (configurable) y solo ve lo suyo");
as("lela"); await C.endClass(sid);
as("pastor"); const rep = (await C.listReports())[0].content as any;
ok(rep.lesson.week === 1 && rep.teacher.name === "Lela" && rep.attendance.PRESENTE === 1 && rep.attendance.EXCUSA === 1 && rep.observations === "Excelente participación." && rep.presentation.slides_used >= 1 && rep.students.length === 2, "Informe de clase completo (lección, maestro, asistencia, actividades, presentación, observaciones, estudiantes)");
ok((await C.listSessions())[0].has_report && (await C.reportDeliveries()).length === 0, "Sin correos configurados no se encola ningún envío (no se simula)");
as("lela"); ok((await C.listReports()).length === 0, "El maestro no lee los informes (son para Pastor/Administrador)");

console.log("5) Tareas, calificación, participación y coronas");
as("lela"); const now = Date.now();
await S.createTask({ week: 1, title: "Dibuja lo que Dios creó", opens_at: new Date(now - 3600e3).toISOString(), closes_at: new Date(now + 36e5 * 5).toISOString() });
const task = (await S.listTasks())[0];
as("est1"); ok((await (await import("../../src/backend/resources")).listNotifications()).some((n) => n.kind === "TAREA_NUEVA"), "El estudiante recibe la notificación de tarea nueva");
await S.submitLink(task.id, "https://ejemplo.test/mi-dibujo");
ok(await fails(() => S.submitLink(task.id, "https://x")) === false, "Se pueden conservar varias versiones de la entrega dentro de la ventana");
as("est2"); ok((await S.listSubmissions()).length === 0, "Otro estudiante no ve la entrega");
as("lela"); const subs = await S.listSubmissions(task.id);
await S.gradeSubmission(subs[0].id, 18, "¡Muy bien!"); await S.setParticipation(uid(5), 1, 25);
ok(await fails(() => S.setParticipation(uid(5), 1, 30)), "La participación máxima es 25");
as("tefa"); ok(await fails(() => S.gradeSubmission(subs[0].id, 5)) && await fails(() => S.setParticipation(uid(5), 1, 5)), "Otro maestro no califica");
as("est1"); const sc = (await S.myScores())[0];
ok(Number(sc.attendance_pts) === 25 && Number(sc.submission_pts) === 18 && Number(sc.participation_pts) === 25 && Number(sc.total) === 68, "Puntuación 4×25: asistencia 25 + tarea 18 + participación 25 + examen 0 = 68");
const nts = await R.listNotifications(); ok(nts.some((n) => n.kind === "RESULTADO"), "Recibe la notificación de su calificación");
await R.markNotificationRead(nts[0].id); ok((await R.listNotifications()).find((n) => n.id === nts[0].id)?.read_at !== null, "Puede marcar la notificación como leída");
const games = await S.listGames();
const orderGame = games.find((g) => g.kind === "ORDENAR_PALABRAS" && !g.counts_as_exam)!;
await S.saveGameResult(orderGame.id, 100, 100, {});
ok(Number((await S.myScores())[0].exam_pts) === 0, "Un juego que NO cuenta como examen (ordenar) no suma puntos de examen");
await S.saveGameResult("e0000000-0000-0000-0000-000000000001", 80, 100, { movimientos: 12 });
ok(Number((await S.myScores())[0].exam_pts) === 20 && Number((await S.myScores())[0].total) === 88, "La prueba lúdica aporta 20 de 25 al examen: total 88");
ok(await fails(() => S.saveGameResult("e0000000-0000-0000-0000-000000000001", 150, 100)), "La puntuación no supera el máximo");

console.log("6) Actividades obligatorias e integración (coronas)");
as("pastor");
await S.createMandatoryActivity({ week: 1, title: "Actividad vigente", instructions: "Cuenta algo que Dios creó.", points: 5, due_at: new Date(now + 864e5).toISOString() });
await S.saveIntegrationActivity({ week: 1, title: "Mira lo que Dios creó", description: null, instructions: null, materials: null, points: 5, evidence: null });
as("est1"); const act = (await S.listActivities())[0]; await S.completeActivity(act.id, "Un pez");
ok((await S.mySubmittedActivities()).includes(act.id), "El estudiante completa su actividad obligatoria");
as("lela"); await S.assignIntegration(1, uid(5));
ok(await fails(() => S.registerParticipation(1, uid(5))), "El maestro de la MISMA lección no registra la participación");
as("tefa"); await S.registerParticipation(1, uid(5));
as("est1"); ok((await S.myCrowns()).length === 1 && (await S.myIntegration()).length === 1, "La participación (registrada por el maestro de la lección siguiente) suma una CORONA");
as("est2"); ok((await S.myCrowns()).length === 0, "Otro estudiante no ve las coronas ajenas");

console.log("7) Estudiante: privacidad y resumen");
as("pastor"); const all = await T.studentProgress(); ok(all.length === 2 && all.find((x) => x.student_id === uid(5))?.crowns === 1, "El Pastor ve el progreso de los estudiantes (con coronas)");
as("lela"); ok((await T.studentProgress()).length === 2, "El maestro ve el progreso de sus estudiantes");
as("est2"); ok((await T.studentProgress()).length === 1 && (await T.teacherProgress()).length === 0, "El estudiante no ve a otros estudiantes ni a los maestros");
ok((await R.listResources()).length === 0, "Recursos: consulta funcional (la carga de archivos requiere Storage real)");
done();
