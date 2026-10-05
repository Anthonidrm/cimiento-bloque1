// Renderiza la aplicación completa en cada ruta para cada rol y comprueba qué contenido aparece.
// Ejecutar desde la raíz:  NODE_OPTIONS="--import ./tools/pruebas/register.mjs" npx --yes tsx --tsconfig tsconfig.app.json tools/pruebas/rutas.tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { store, ok, done } from "./shim";

const { AuthProvider } = await import("../../src/auth/AuthContext");
const App = (await import("../../src/App")).default;
const render = (url: string) => renderToStaticMarkup(<MemoryRouter initialEntries={[url]}><AuthProvider><App /></AuthProvider></MemoryRouter>);
const as = (role: string | null, id = "x") => {
  store.clear();
  if (role) store.set("cimiento:auth:session", JSON.stringify({ userId: id, role, displayName: id, startedAt: "2026-01-01" }));
};

const MARK: Record<string, string> = {
  "/": "Ver el Plan Anual", "/plan-anual": "52 semanas · 12 módulos", "/plan-anual/semana-1": "Dios me creó", "/recursos": "Biblioteca",
  "/maestros": "Área del maestro", "/mi-progreso": "Mi progreso", "/plan-anual/semana-1/guia": "Abrir apartado",
  "/plan-anual/semana-1/examen": "Examen de preparación del maestro", "/plan-anual/semana-1/presentacion": "viewer__slide",
  "/plan-anual/semana-1/revision": "Historial de errores", "/cuenta": "Cambiar contraseña", "/estudiante": "Área del estudiante",
  "/pastor": "Panel del Pastor", "/administracion": "Usuarios (estado actual)", "/login": "Iniciar sesión", "/sobre-cimiento": "Sobre",
};
const STAFF = ["/sobre-cimiento", "/", "/plan-anual", "/plan-anual/semana-1", "/recursos", "/maestros", "/mi-progreso", "/plan-anual/semana-1/guia", "/plan-anual/semana-1/examen", "/plan-anual/semana-1/presentacion", "/plan-anual/semana-1/revision", "/cuenta", "/estudiante"];
const ALLOWED: Record<string, string[]> = {
  visitante: ["/login", "/sobre-cimiento"],
  MAESTRO: STAFF,
  PASTOR: [...STAFF, "/pastor"],
  ADMINISTRADOR: [...STAFF, "/pastor", "/administracion"],
  ESTUDIANTE: ["/estudiante", "/cuenta"],
};

for (const [role, allowed] of Object.entries(ALLOWED)) {
  console.log(`— ${role} —`);
  as(role === "visitante" ? null : role);
  let good = 0;
  const bad: string[] = [];
  for (const [url, marker] of Object.entries(MARK)) {
    const shown = render(url).includes(marker);
    const should = allowed.includes(url);
    if (shown === should) good++; else bad.push(`${url} (${shown ? "se mostró y no debía" : "NO se mostró y debía"})`);
  }
  ok(bad.length === 0, `${role}: ${good}/${Object.keys(MARK).length} rutas correctas${bad.length ? " — fallos: " + bad.join("; ") : ""}`);
}

console.log("— Detalles —");
as("MAESTRO", "lela"); let h = render("/plan-anual/semana-1/examen");
ok(h.includes("Relación") && h.includes("Pendiente de revisión pastoral") && h.includes("Confirmar relación") && h.includes("Intento único"), "Examen: pregunta de relación (con marca de revisión pastoral), botón de confirmar e intento único");
ok(h.includes("no se puede cambiar"), "Examen: avisa que la primera respuesta no se puede cambiar");
h = render("/plan-anual/semana-1/presentacion"); ok(h.includes("/presentaciones/semana-1/slide-1.jpg") && h.includes("0 de 9"), "Visor: muestra la diapositiva 1 y el uso registrado");
h = render("/plan-anual/semana-2"); ok(h.includes("Proyectar en la aplicación"), "Semana: ofrece proyectar en la app (cuenta para la preparación)");
h = render("/"); ok(h.includes(">Maestros<") && !h.includes(">Administración<") && !h.includes(">Pastor<"), "Menú del maestro: sin Pastor ni Administración");
as("PASTOR", "usuarios"); h = render("/pastor");
ok(h.includes("Asignar / cambiar maestro") && h.includes("Requiere backend"), "Panel del Pastor: asignar maestro y progreso, marcados 'Requiere backend'");
ok(!h.includes("Restablecer") && !h.includes("Usuarios (estado actual)"), "Pastor: sin acceso a usuarios ni contraseñas");
h = render("/"); ok(h.includes(">Pastor<") && !h.includes(">Administración<"), "Menú del Pastor: ve Pastor, no Administración");
as("ADMINISTRADOR", "admin"); h = render("/administracion");
ok(["A. Usuarios", "B. Roles", "C. Asignación de maestros", "D. Progreso de maestros", "E. Progreso de estudiantes", "F. Recursos", "G. Lecciones", "H. Actividades", "I. Configuración"].every((t) => h.includes(t)), "Administración: secciones A–I presentes");
ok(h.includes("Restablecer contraseña") && h.includes("Restablecer</button>"), "Administrador: puede restablecer contraseñas");
as("ESTUDIANTE", "estudiante"); h = render("/estudiante"); ok(h.includes("Área del estudiante") && !h.includes(">Plan Anual<"), "Estudiante: solo su área en el menú");
as(null); h = render("/login"); ok(h.includes("Iniciar sesión") && !h.includes(">Plan Anual<") && !h.includes(">Maestros<"), "Visitante: la pantalla de login no ofrece accesos al sistema");
done();
