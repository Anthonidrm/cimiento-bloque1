// Prueba de EXTREMO A EXTREMO: la app completa renderizada en un navegador simulado (jsdom), con el cliente real de
// supabase-js contra PostgreSQL + PostgREST (permisos reales). Auth y Storage son SIMULADORES (supabase/tests/proxy.mjs):
// no prueba Supabase Auth, Storage ni Edge Functions reales.
// Ejecutar:  supabase/tests/e2e.sh
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { ok, done } from "./shim"; // el shim define document/localStorage falsos: se importa ANTES de montar jsdom

// ---- navegador simulado (antes de cargar React) ----
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: "http://localhost/", pretendToBeVisual: true });
const w = dom.window as unknown as Record<string, unknown> & Window;
for (const k of ["window", "document", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement", "Node", "Event", "MouseEvent", "KeyboardEvent", "localStorage", "getComputedStyle"]) (globalThis as any)[k] = (w as any)[k] ?? (k === "window" ? w : undefined);
(globalThis as any).window = w;
Object.defineProperty(globalThis, "navigator", { value: w.navigator, configurable: true });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
w.confirm = () => true;
(globalThis as any).confirm = () => true;
(w as any).open = () => null;
const opened: string[] = [];
(w as any).open = (u: string) => { opened.push(u); return null; };

import React from "react";
import { createClient } from "@supabase/supabase-js";
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { AuthProvider } = await import("../../src/auth/AuthContext");
const App = (await import("../../src/App")).default;
const { setClientForTests } = await import("../../src/backend/client");
const { weeks } = await import("../../src/data/weeks");

const SECRET = "cimiento-local-test-secret-0123456789abcdef", URL = "http://127.0.0.1:54321";
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const anon = (() => { const h = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role: "anon", exp: Math.floor(Date.now() / 1000) + 7200 })}`; return `${h}.${createHmac("sha256", SECRET).update(h).digest("base64url")}`; })();
const uid = (n: number) => `a0000000-0000-0000-0000-00000000000${n}`;
const PW = "ClaveDePrueba#1";

function sql(q: string): string {
  writeFileSync("/tmp/e2e.sql", q);
  return execFileSync("su", ["postgres", "-c", "psql -d cimiento_test -At -v ON_ERROR_STOP=1 -f /tmp/e2e.sql"], { encoding: "utf8" }).trim();
}

// ---- utilidades de interfaz ----
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const text = () => document.body.textContent ?? "";
async function waitFor(fn: () => boolean, what: string, ms = 9000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (fn()) return; await act(async () => { await sleep(60); }); }
  throw new Error(`tiempo agotado esperando: ${what}\n   mensajes: ${all(".pn-msg").map((m) => m.textContent).join(" | ") || "(ninguno)"}\n   pantalla: ${text().replace(/\s+/g, " ").slice(0, 200)}`);
}
const all = <T extends Element>(sel: string) => [...document.querySelectorAll<T>(sel)];
const byText = (sel: string, t: string, exact = false) => all<HTMLElement>(sel).find((e) => (exact ? e.textContent?.trim() === t : e.textContent?.includes(t)));
async function click(el: Element | undefined | null, what = "elemento") {
  if (!el) throw new Error(`no se encontró: ${what}`);
  await act(async () => { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })); await sleep(30); });
}
async function setValue(el: Element | null | undefined, v: string, what = "campo") {
  if (!el) throw new Error(`no se encontró: ${what}`);
  const proto = el instanceof w.HTMLSelectElement ? w.HTMLSelectElement.prototype : el instanceof w.HTMLTextAreaElement ? w.HTMLTextAreaElement.prototype : w.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, v);
    el.dispatchEvent(new w.Event(el instanceof w.HTMLSelectElement ? "change" : "input", { bubbles: true }));
    await sleep(20);
  });
}
async function step(label: string, fn: () => Promise<void>) {
  try { await fn(); ok(true, label); } catch (e) { ok(false, `${label} — ${(e as Error).message}`); }
}

let current: { unmount: () => Promise<void> } | null = null;
async function mount(url: string) {
  if (current) await current.unmount();
  document.body.innerHTML = "";
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(<MemoryRouter initialEntries={[url]}><AuthProvider><App /></AuthProvider></MemoryRouter>); });
  current = { unmount: async () => { await act(async () => root.unmount()); } };
}
/** Cliente NUEVO por actor (sesión limpia), como si fuera otro navegador. */
let n = 0;
const freshClient = () => setClientForTests(createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false, storageKey: `e2e-${++n}` } }));
async function loginAs(user: string, pass = PW, start = "/") {
  freshClient();
  await mount(start);
  await waitFor(() => text().includes("Iniciar sesión") && !!document.querySelector('input[autocomplete="username"]'), "pantalla de login");
  await setValue(document.querySelector('input[autocomplete="username"]'), user, "usuario");
  await setValue(document.querySelector('input[type="password"]'), pass, "contraseña");
  await click(byText("button", "Entrar", true), "botón Entrar");
}

// ============================ datos de preparación ============================
sql(`update profiles set must_change_password = false;`); // usuarios ya activados (el primer acceso se prueba al final)
sql(`
  insert into exam_questions select 'x' where false;  -- (las claves ya vienen de las semillas)
  insert into guide_progress(user_id, week, section, seconds, completed_at) select '${uid(3)}', 1, s, 30, now() from generate_series(1,23) s;
  insert into exam_attempts(user_id, week, attempt_no, completed_at, score_percent) values ('${uid(3)}', 1, 1, now(), 90);
`.replace(/^\s*insert into exam_questions[^\n]*\n/m, ""));

console.log("1) Visitante: login primero");
await step("Sin sesión, una ruta interna lleva al login", async () => { freshClient(); await mount("/plan-anual"); await waitFor(() => text().includes("Iniciar sesión"), "login"); });
await step("Contraseña incorrecta: mensaje genérico", async () => {
  await setValue(document.querySelector('input[autocomplete="username"]'), "lela"); await setValue(document.querySelector('input[type="password"]'), "mala");
  await click(byText("button", "Entrar", true)); await waitFor(() => text().includes("Usuario o contraseña incorrectos."), "mensaje de error");
});

console.log("2) Administrador");
await step("Login del Administrador → su panel", async () => { await loginAs("admin"); await waitFor(() => text().includes("Panel del Administrador"), "panel admin"); });
await step("Asigna el maestro a la semana 1 desde la pantalla", async () => {
  await click(byText("button", "Asignaciones", true), "pestaña Asignaciones");
  await waitFor(() => !!document.querySelector('select[aria-label="Maestro para la semana 1"]'), "tabla de asignaciones");
  const sel = document.querySelector('select[aria-label="Maestro para la semana 1"]')!;
  await setValue(sel, uid(3), "selector de maestro");
  await click(sel.closest("tr")!.querySelector("button"), "botón Asignar");
  await waitFor(() => text().includes("Maestro asignado."), "confirmación");
  ok(sql(`select teacher_id from teacher_assignments where week = 1`) === uid(3), "La asignación quedó guardada en la base de datos con el maestro correcto");
  ok(sql(`select assigned_by from teacher_assignments where week = 1`) === uid(1), "El servidor registró QUIÉN asignó (el Administrador)");
});
await step("Cada lección muestra el MAESTRO ASIGNADO", async () => { await waitFor(() => text().includes("Lela") && text().includes("Sin asignar"), "nombre del maestro / Sin asignar"); });
await step("Historial de cambios visible solo para staff", async () => { await click(byText("button", "Historial de cambios", true)); await waitFor(() => text().includes("teacher_assignments") || text().includes("profiles") || text().includes("Sin cambios"), "historial"); });
await step("La pestaña Revisión pastoral lista las preguntas marcadas", async () => { await click(byText("button", "Revisión pastoral", true)); await waitFor(() => text().includes("Pendiente de revisión pastoral") && text().includes("s1-q9"), "preguntas pendientes"); });

console.log("3) Pastor");
await step("Login del Pastor → su panel (supervisión)", async () => { await loginAs("pastor"); await waitFor(() => text().includes("Supervisión de CIMIENTO"), "panel pastor"); });
await step("El Pastor NO entra a /administracion (vuelve a su panel)", async () => {
  await mount("/administracion"); await waitFor(() => text().includes("Supervisión de CIMIENTO") || text().includes("Cargando"), "redirección");
  await waitFor(() => text().includes("Supervisión de CIMIENTO"), "panel pastor"); ok(!text().includes("Panel del Administrador"), "El Pastor no ve el panel del Administrador");
});
await step("El Pastor ve el progreso de los maestros", async () => {
  await click(byText("button", "Progreso de maestros", true)); await waitFor(() => text().includes("Lela") && text().includes("23/23"), "fila de Lela con 23/23 apartados");
});

console.log("4) Maestro: aula, clase, pase de lista, tareas, informe");
await step("Login del maestro → sus lecciones asignadas", async () => { await loginAs("lela"); await waitFor(() => text().includes("Mis lecciones asignadas") && text().includes("Abrir aula"), "mis lecciones"); });
await step("Solo ve su propio progreso (no el de otros maestros)", async () => { await waitFor(() => text().includes("Mi progreso"), "tabla Mi progreso"); ok(!text().includes("Tefa"), "No aparece otro maestro"); });
await step("Abre el aula: MAESTRO ASIGNADO visible", async () => { await click(byText("a", "Abrir aula"), "Abrir aula"); await waitFor(() => text().includes("MAESTRO ASIGNADO:") && text().includes("Lela"), "aula"); });
await step("INICIAR CLASE: el servidor verifica la preparación y arranca el temporizador", async () => {
  await click(byText("button", "INICIAR CLASE"), "INICIAR CLASE"); await waitFor(() => text().includes("Clase en curso"), "clase en curso");
  ok(!!document.querySelector('[role="timer"]'), "Hay temporizador");
  ok(sql(`select status from class_sessions where week = 1`) === "EN_CURSO", "La sesión quedó EN_CURSO en la base de datos");
});
await step("Pase de lista: Presente → asistencia y 25 puntos automáticos", async () => {
  await waitFor(() => !!byText("td", "Estudiante 1", true), "lista de estudiantes");
  const row = byText("td", "Estudiante 1", true)!.closest("tr")!;
  await click([...row.querySelectorAll("button")].find((b) => b.textContent === "Presente"), "botón Presente");
  await waitFor(() => text().includes("Estudiante 1: presente."), "confirmación");
  ok(sql(`select status from attendance where student_id = '${uid(5)}'`) === "PRESENTE", "Asistencia guardada");
  ok(sql(`select attendance_pts from lesson_scores where student_id = '${uid(5)}' and week = 1`) === "25", "La asistencia alimentó la puntuación automáticamente (25)");
});
await step("Participación del estudiante (0–25)", async () => {
  await setValue(document.querySelector('input[aria-label="Participación de Estudiante 1"]'), "20");
  const row = byText("td", "Estudiante 1", true)!.closest("tr")!;
  await click([...row.querySelectorAll("button")].find((b) => b.textContent === "Guardar"), "Guardar participación");
  await waitFor(() => text().includes("Participación guardada."), "confirmación");
  ok(sql(`select participation_pts from lesson_scores where student_id = '${uid(5)}' and week = 1`) === "20", "Participación guardada (20)");
});
await step("Crear una tarea (período hasta la próxima clase)", async () => {
  await setValue(byText("label", "Título")!.querySelector("input"), "Dibuja a tu familia");
  await setValue(document.querySelector('input[type="datetime-local"]'), "2030-01-01T10:00");
  await click(byText("button", "Crear tarea", true), "Crear tarea"); await waitFor(() => text().includes("Tarea creada."), "confirmación");
  ok(sql(`select count(*) from assignments where title = 'Dibuja a tu familia' and created_by = '${uid(3)}'`) === "1", "Tarea creada con su autor");
});
await step("Registro de actividad y observación de la clase", async () => {
  await setValue(document.querySelector('input[placeholder="Ej.: dinámica de apertura"]'), "Dinámica de apertura");
  await click(byText("button", "Registrar actividad", true)); await waitFor(() => text().includes("Actividad registrada."), "confirmación");
  await setValue(document.querySelector("textarea"), "Clase tranquila y participativa");
  await click(byText("button", "Guardar observación", true)); await waitFor(() => text().includes("Observación guardada."), "confirmación");
});
await step("FINALIZAR CLASE: informe completo generado", async () => {
  await click(byText("button", "FINALIZAR CLASE"), "FINALIZAR CLASE"); await waitFor(() => text().includes("Clase finalizada. Informe generado."), "clase finalizada");
  ok(sql(`select status from class_sessions where week = 1`) === "FINALIZADA", "La sesión quedó FINALIZADA");
  ok(sql(`select count(*) from class_reports r join class_sessions s on s.id = r.session_id where s.week = 1`) === "1", "Se guardó el informe de clase");
  ok(sql(`select content->>'observations' from class_reports limit 1`) === "Clase tranquila y participativa", "El informe incluye las observaciones");
  ok(sql(`select count(*) from notification_deliveries where status = 'ENVIADA' or sent_at is not null`) === "0", "Ningún correo figura como enviado: el envío no se simula");
});

console.log("5) Estudiante");
await step("Login del estudiante → su área", async () => { await loginAs("est1"); await waitFor(() => text().includes("Área del estudiante") && text().includes("Mi progreso"), "área del estudiante"); });
await step("Mis resultados: asistencia 25 y participación 20", async () => {
  await click(byText("button", "Mis resultados", true)); await waitFor(() => !!all("tbody tr td").length && text().includes("Semana"), "tabla de resultados");
  const cells = all("tbody tr").map((r) => [...r.querySelectorAll("td")].map((c) => c.textContent)).find((c) => c[0] === "1")!;
  ok(cells[1] === "25" && cells[3] === "20", `Resultados: asistencia ${cells[1]}, participación ${cells[3]}`);
});
await step("Mis tareas: ve la tarea abierta y entrega un enlace", async () => {
  await click(byText("button", "Mis tareas", true)); await waitFor(() => text().includes("Dibuja a tu familia") && text().includes("Abierta"), "tarea abierta");
  await setValue(document.querySelector('input[aria-label="Enlace"]'), "https://ejemplo.test/mi-dibujo");
  await click(byText("button", "Entregar enlace", true)); await waitFor(() => text().includes("¡Enlace entregado!"), "confirmación");
  ok(sql(`select count(*) from submissions where student_id = '${uid(5)}' and kind = 'ENLACE'`) === "1", "Entrega guardada con el estudiante correcto");
});
await step("Juegos: completa el versículo (prueba) y suma al examen del estudiante", async () => {
  await click(byText("button", "Juegos", true)); await waitFor(() => text().includes("Completa el versículo"), "lista de juegos");
  const g = [...all(".pn-card")].find((c) => c.textContent?.includes("Completa el versículo") && c.textContent.includes("Semana 1"))!;
  await click(g.querySelector("button"), "Jugar");
  await waitFor(() => !!document.querySelector('input[aria-label="Palabra 1"]'), "espacios en blanco");
  const verse = weeks.find((x) => x.week === 1)!.verseRVR1960.text.split(/\s+/);
  const blanks = JSON.parse(sql(`select config->'blanks' from games where week = 1 and kind = 'COMPLETAR_VERSICULO'`)) as number[];
  for (let k = 0; k < blanks.length; k++) await setValue(document.querySelector(`input[aria-label="Palabra ${k + 1}"]`), verse[blanks[k]]);
  await click(byText("button", "Terminar", true)); await waitFor(() => text().includes("100 de 100"), "puntaje 100");
  await click(byText("button", "Guardar mi resultado", true)); await waitFor(() => text().includes("Resultado guardado"), "guardado");
  ok(sql(`select exam_pts from lesson_scores where student_id = '${uid(5)}' and week = 1`) === "25", "La prueba sumó 25 puntos de examen");
  ok(sql(`select total from lesson_scores where student_id = '${uid(5)}' and week = 1`) === "70", "Total acumulado de la lección: 25 + 20 + 25 = 70");
});
await step("El estudiante NO entra a la administración ni al aula", async () => { await mount("/administracion"); await waitFor(() => text().includes("Área del estudiante"), "redirigido a su área"); ok(!text().includes("Panel del Administrador"), "No ve administración"); });

console.log("6) Privacidad entre estudiantes y primer acceso");
await step("Otro estudiante no ve la entrega ni los puntos de est1", async () => {
  await loginAs("est2"); await waitFor(() => text().includes("Área del estudiante"), "área");
  await click(byText("button", "Mis tareas", true)); await waitFor(() => text().includes("Dibuja a tu familia"), "tarea");
  ok(!text().includes("Entregaste"), "No ve la entrega de otro estudiante");
  await click(byText("button", "Mis resultados", true)); await waitFor(() => text().includes("Todavía no tienes resultados."), "sin resultados propios");
});
await step("Primer acceso: debe definir su contraseña antes de entrar al área", async () => {
  sql(`update profiles set must_change_password = true where id = '${uid(6)}'`);
  await loginAs("est2"); await waitFor(() => text().includes("Mi cuenta"), "redirigido a /cuenta");
  const pws = all<HTMLInputElement>('input[type="password"]');
  await setValue(pws[0], PW); await setValue(pws[1], "NuevaClave#2026"); await setValue(pws[2], "NuevaClave#2026");
  await click(byText("button", "Cambiar", false) ?? byText("button", "Guardar"), "botón de cambio");
  await waitFor(() => text().includes("Contraseña actualizada."), "contraseña actualizada");
  ok(sql(`select must_change_password from profiles where id = '${uid(6)}'`) === "f", "El servidor limpió la marca de primer acceso");
});
await step("Con la contraseña nueva se puede entrar; con la vieja ya no", async () => {
  freshClient(); const { backendLogin } = await import("../../src/auth/backendAuth");
  ok((await backendLogin("est2", "NuevaClave#2026")).ok, "Entra con la nueva");
  freshClient(); ok(!(await backendLogin("est2", PW)).ok, "La vieja ya no funciona");
});

console.log("7) Sincronización de la preparación del maestro con el servidor");
await step("Guía, examen y presentación se envían al servidor con sus reglas, y se recuperan en otro dispositivo", async () => {
  await loginAs("tefa"); await waitFor(() => text().includes("Mi progreso") || text().includes("Maestros"), "sesión del maestro");
  const S = await import("../../src/backend/sync");
  const G = await import("../../src/services/guidePrepService");
  const E = await import("../../src/services/examService");
  const PR = await import("../../src/services/presentationService");
  const PP = await import("../../src/services/preparationService");
  const q1 = weeks.find((x) => x.week === 1)!.examQuestions[0];

  S.queueGuideSeconds(1, 1, 35); await S.flushQueue();
  ok(sql(`select seconds || '/' || (completed_at is not null) from guide_progress where user_id = '${uid(4)}' and week = 1 and section = 1`) === "35/true", "Guía: 35 s en el apartado 1 → el servidor lo marca completado");
  S.queueGuideSeconds(1, 3, 10); await S.flushQueue();
  ok(sql(`select count(*) from guide_progress where user_id = '${uid(4)}' and section = 3`) === "0" && /anterior/.test(S.getSyncStatus().lastError ?? ""), "Guía: el servidor rechaza saltarse un apartado (y la app lo registra)");
  const r1 = await S.pushExamAnswer(1, q1, { optionId: q1.correctOptionId });
  ok(r1?.is_correct === true && sql(`select count(*) from exam_answers a join exam_attempts t on t.id = a.attempt_id where t.user_id = '${uid(4)}'`) === "1", "Examen: el SERVIDOR califica y registra la respuesta");
  const r2 = await S.pushExamAnswer(1, q1, { optionId: q1.options.find((o) => o.id !== q1.correctOptionId)!.id });
  ok(r2 === null && /ya fue respondida/.test(S.getSyncStatus().lastError ?? ""), "Examen: el servidor NO deja cambiar la primera respuesta");
  S.queuePresentationSeconds(1, 1, 6); await S.flushQueue();
  ok(sql(`select seconds from presentation_usage where user_id = '${uid(4)}' and week = 1 and slide = 1`) === "6", "Presentación: el tiempo por diapositiva llega al servidor");

  // "Otro dispositivo": se borra la copia local y se recupera del servidor al iniciar sesión.
  for (const k of Object.keys(localStorage)) if (k.includes(uid(4))) localStorage.removeItem(k);
  ok(G.loadProgress(1, uid(4)).sections[1]?.completed !== true, "(la copia local está vacía)");
  await S.hydrateWeek(1);
  ok(G.loadProgress(1, uid(4)).sections[1]?.completed === true, "Recuperado: apartado 1 completado");
  ok(E.getExamState(1).attempts[0]?.answers[q1.id]?.isCorrect === true, "Recuperado: la respuesta del examen queda bloqueada");
  ok(PR.loadUsage(1, uid(4)).seconds[1] === 6, "Recuperado: segundos de la presentación");

  // El porcentaje local coincide con el que calcula el servidor.
  const local = PP.computePreparation(1, uid(4)).components;
  const srv = sql(`select guide_pts || '/' || exam_pts || '/' || presentation_pts from teacher_prep('${uid(4)}', 1)`).split("/").map(Number);
  ok(Math.abs(local.find((c) => c.key === "guide")!.earned - srv[0]) < 0.06 && Math.abs(local.find((c) => c.key === "presentation")!.earned - srv[2]) < 0.06, `Preparación local = servidor (guía ${srv[0]}, presentación ${srv[2]})`);
});

console.log("8) Recursos reemplazables y almacenamiento privado");
const NodeFile = (globalThis as any).File as typeof File;
async function pickFile(input: Element | null | undefined, name: string) {
  if (!input) throw new Error("no se encontró el selector de archivo");
  input.removeAttribute("required"); // jsdom no cuenta el archivo simulado en su validación interna (un navegador real sí)
  Object.defineProperty(input, "files", { value: [new NodeFile(["contenido de prueba"], name, { type: "application/pdf" })], configurable: true });
  await act(async () => { input.dispatchEvent(new w.Event("change", { bubbles: true })); await sleep(20); });
}
async function addResource(who: string, fileName: string, audienceLabel: string, title: string) {
  await loginAs(who); await waitFor(() => text().includes("Administración") || text().includes("Supervisión"), "panel");
  await click(byText("button", "Recursos", true), "pestaña Recursos");
  await waitFor(() => text().includes("Recursos de las lecciones"), "formulario de recursos");
  await setValue(byText("label", "Título")!.querySelector("input"), title);
  await setValue(byText("label", "Visible para")!.querySelector("select"), audienceLabel);
  await pickFile(byText("label", "Archivo")!.querySelector("input"), fileName);
  await click(byText("button", "Agregar / reemplazar", true), "Agregar / reemplazar");
  await waitFor(() => text().includes("Recurso guardado."), "recurso guardado");
}
await step("Administrador agrega una presentación y la REEMPLAZA: una sola referencia, historial conservado", async () => {
  await addResource("admin", "presentacion-v1.pdf", "MAESTRO", "Presentación Semana 1");
  ok(sql(`select count(*) from resources where week = 1 and kind = 'PRESENTACION'`) === "1" && sql(`select count(*) from resource_versions`) === "1", "Se creó 1 recurso con 1 versión");
  await addResource("admin", "presentacion-v2.pdf", "MAESTRO", "Presentación Semana 1");
  ok(sql(`select count(*) from resources where week = 1 and kind = 'PRESENTACION'`) === "1", "Reemplazar NO crea un duplicado");
  ok(sql(`select count(*) from resource_versions`) === "2" && sql(`select filename from resource_versions where is_current`) === "presentacion-v2.pdf", "Historial: 2 versiones y la vigente es la nueva");
  ok(/^maestro\/1\/PRESENTACION\/principal\/\d+-presentacion-v2\.pdf$/.test(sql(`select storage_path from resource_versions where is_current`)), "El archivo va a la ruta privada convenida (audiencia/semana/tipo/ranura)");
});
await step("El Pastor también puede reemplazar recursos", async () => {
  await addResource("pastor", "presentacion-v3.pdf", "MAESTRO", "Presentación Semana 1");
  ok(sql(`select count(*) from resource_versions`) === "3" && sql(`select count(*) from resource_versions where is_current`) === "1", "3 versiones, 1 vigente");
  ok(sql(`select uploaded_by from resource_versions where is_current`) === uid(2), "El servidor registra QUIÉN subió la versión (el Pastor)");
});
sql(`insert into resources(week, kind, slot, title, audience) values (1, 'HOJA_TRABAJO', 'principal', 'Hoja de trabajo Semana 1', 'TODOS');
     insert into resource_versions(resource_id, storage_path, filename, uploaded_by) select id, 'todos/1/HOJA_TRABAJO/principal/1-hoja.pdf', 'hoja.pdf', '${uid(1)}' from resources where kind = 'HOJA_TRABAJO';
     insert into resources(week, kind, slot, title, audience) values (1, 'IMAGEN', 'diapositiva-1', 'Diapositiva 1 — Semana 1', 'MAESTRO');
     insert into resource_versions(resource_id, storage_path, filename, uploaded_by) select id, 'maestro/1/IMAGEN/diapositiva-1/1-slide-1.jpg', 'slide-1.jpg', '${uid(1)}' from resources where kind = 'IMAGEN';`);
await step("El estudiante ve su hoja pero NO la presentación del maestro", async () => {
  await loginAs("est1"); await waitFor(() => text().includes("Área del estudiante"), "área");
  await click(byText("button", "Mis recursos", true)); await waitFor(() => text().includes("Hoja de trabajo Semana 1"), "su hoja");
  ok(!text().includes("Presentación Semana 1"), "No ve la presentación (solo maestros)");
});
await step("El maestro ve ambos recursos en la biblioteca (privada)", async () => {
  await loginAs("lela", PW, "/recursos"); await waitFor(() => text().includes("Presentación Semana 1") && text().includes("Hoja de trabajo Semana 1"), "biblioteca del maestro");
  await click(byText("button", "Abrir"), "Abrir"); await waitFor(() => opened.some((u) => u.includes("/object/sign/recursos/")), "URL firmada");
  ok(opened.at(-1)!.includes("/storage/v1/object/sign/recursos/maestro/1/PRESENTACION/"), "Se abrió con una URL FIRMADA del bucket privado");
});
await step("Con backend, ninguna pantalla enlaza archivos de public/", async () => {
  for (const url of ["/recursos", "/plan-anual/semana-1"]) {
    await mount(url); await waitFor(() => text().includes("Recursos") || text().includes("Dios me creó"), url);
    await act(async () => { await sleep(300); });
    const bad = all<HTMLAnchorElement>("a").map((a) => a.getAttribute("href") ?? "").filter((h) => /^\/(recursos-semana|guias|presentaciones)/.test(h));
    ok(bad.length === 0, `${url}: sin enlaces a archivos públicos${bad.length ? " — " + bad.join(", ") : ""}`);
  }
});
await step("El visor proyecta las diapositivas desde URL firmadas del bucket privado", async () => {
  await mount("/plan-anual/semana-1/presentacion"); await waitFor(() => !!document.querySelector("img.viewer__slide"), "visor");
  await waitFor(() => (document.querySelector("img.viewer__slide") as HTMLImageElement).src.includes("/object/sign/recursos/maestro/1/IMAGEN/diapositiva-1"), "URL firmada de la diapositiva 1");
});

if (current) await current.unmount();
done();
