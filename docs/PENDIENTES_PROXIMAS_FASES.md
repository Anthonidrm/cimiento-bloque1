# PENDIENTES — PRÓXIMAS FASES

> **Estado a la fecha de esta rama (`feature/sistema-integral-fase-a-b`)** — detalle de cada ítem al final de este bloque.
> - ✅ Hecho: personajes ajustados, 4 hojas para colorear nuevas, materiales regenerados, login primero, roles con su área,
>   examen con respuesta bloqueada e intentos, preguntas de relación, preparación 50/30/20, presentación por uso real.
> - 🗄️ Esquema de base de datos **propuesto y probado** (71 pruebas): `supabase/migrations/0001_cimiento_base.sql` y
>   [`BACKEND_PROPUESTA.md`](BACKEND_PROPUESTA.md). **No aplicado** a ningún proyecto.
> - ⛔ Requiere backend (no se simula con `localStorage`): A–H, J–W, Z, AA–AF, AI y el progreso compartido entre usuarios.

| Id | Pendiente | Estado |
|----|-----------|--------|
| A  | Inicio/finalización de clase | 🗄️ función `start_class()`/`end_class()` probada en SQL; falta backend y pantalla |
| B  | Temporizador de clase | ⛔ depende de A |
| C  | Registro de interacción del maestro | ◐ guía/examen/presentación se registran (localStorage); sesión de clase pendiente |
| D  | Pase de lista | 🗄️ tabla y permisos probados; falta backend y pantalla |
| E–H | Puntos de asistencia, entrega, participación y examen (4×25) | 🗄️ `lesson_scores` probada; falta backend |
| I  | Área completa del estudiante | ⛔ solo pantalla de bienvenida |
| J  | Subida de tareas | 🗄️ ventana de entrega probada; falta Storage |
| K–M | Juegos digitales | 🗄️ tabla `games`; sin juegos |
| N  | Fotos de clase | 🗄️ tabla `class_photos`; falta Storage |
| O–P | Notificaciones / WhatsApp | 🗄️ tabla `notifications` (canal APP); WhatsApp no implementado |
| Q  | Asignación de maestros | 🗄️ probada en SQL; paneles muestran el estado |
| R–T | Asignación en 4 horas, a tiempo/fuera de tiempo, días de atraso | 🗄️ vista `v_assignment_status` y alertas probadas |
| U–W | Reporte de clase y envío a Pastor/Administrador | 🗄️ informe guardado; **envío real sin implementar** (sin proveedor de correo) |
| X–Y | Actividad de integración y su puntuación | 🗄️ tablas probadas; falta backend y pantalla |
| Z  | Sistema de coronas | 🗄️ corona automática probada |
| AA–AC | Recursos/documentos reemplazables, administración por Pastor/Admin | 🗄️ versiones y permisos probados; falta Storage |
| AD–AF | Progreso del estudiante, fotos visibles, pruebas lúdicas | ⛔ |
| AG–AH | Examen digital del maestro e historial de errores | ✅ mejorado: respuesta bloqueada, intentos, relación |
| AI | Asignación de maestros por lección | 🗄️ ver Q |
| AJ | Actividades de integración del Módulo 1 | ◐ documentadas abajo; falta desarrollarlas |


Requisitos oficiales de CIMIENTO que **no se implementan todavía** pero que **no deben perderse**.
No eliminar ninguno. Los modelos de datos preparados para ellos están en `src/domain/futureModels.ts`
(sin conectar a la aplicación).

## A. Lista de pendientes

| Id | Pendiente |
|----|-----------|
| A  | Inicio/finalización de clase. |
| B  | Temporizador de clase. |
| C  | Registro de interacción del maestro. |
| D  | Pase de lista. |
| E  | Asistencia 25 puntos. |
| F  | Entrega de asignación 25 puntos. |
| G  | Participación 25 puntos. |
| H  | Examen estudiante 25 puntos. |
| I  | Área completa del estudiante. |
| J  | Subida de tareas por estudiante/maestro. |
| K  | Juegos digitales por lección. |
| L  | Juegos de palabras. |
| M  | Ordenar elementos. |
| N  | Fotos de clase. |
| O  | Notificaciones. |
| P  | Integración futura con WhatsApp/celular. |
| Q  | Asignación de maestros. |
| R  | Control de asignación dentro de las 4 horas. |
| S  | Indicador de asignación a tiempo/fuera de tiempo. |
| T  | Registro de días/horas de atraso. |
| U  | Reporte posterior a la clase. |
| V  | Envío al Pastor. |
| W  | Envío al Administrador. |
| X  | Actividad de integración. |
| Y  | Puntuación de integración. |
| Z  | Sistema de coronas. |
| AA | Recursos reemplazables. |
| AB | Documentos reemplazables. |
| AC | Administración de recursos por Pastor/Admin. |
| AD | Área de progreso del estudiante. |
| AE | Fotos visibles para estudiantes. |
| AF | Pruebas lúdicas por lección. |
| AG | Examen digital del maestro. *(base implementada en el Bloque 1; se amplía después)* |
| AH | Historial de respuestas incorrectas. *(base implementada en el Bloque 1; se amplía después)* |
| AI | Sistema de asignación de maestros por lección. |
| AJ | Desarrollo de actividades de integración del Módulo 1. |

## B. Actividades de integración del Módulo 1 (requisitos oficiales para una siguiente fase)

### SEMANA 1 — DIOS ME CREÓ

**"Mira lo que Dios creó"**

El niño puede llevar un elemento relacionado con la creación.
Ejemplos: perro, gato, pájaro, planta, fruta, concha, piedra, flor, pez.

El niño dice: "Yo traje un/una ________. Dios lo creó."
Luego menciona una cualidad.
Termina: "¡Dios hizo cosas maravillosas!"

Versículo: **Salmo 139:14** — "Te alabaré; porque formidables, maravillosas son tus obras."

Un animal vivo solamente podrá utilizarse si el padre ha coordinado previamente la logística y no
interfiere con el culto.

### SEMANA 2 — FUI CREADO A IMAGEN DE DIOS

**"Dios me hizo especial"**

Los niños expresan: a quién aman; cómo ayudan; qué les gusta hacer para Dios.

Pueden decir:
- "Yo puedo amar porque fui hecho a imagen de Dios."
- "Yo puedo tener misericordia porque fui creado a imagen de Dios."
- "¡Dios me hizo especial!"

Versículo: **Génesis 1:27** — "Y creó Dios al hombre a su imagen."
Cada niño puede recibir una tarjeta con el versículo.

### SEMANA 3 — DIOS ME CONOCE

**"Dios conoce mi nombre"**

Cada niño dice: "Mi nombre es ________. Dios me conoce."
Los demás: "¡Dios también te conoce a ti!"

Versículo: **Salmo 139:1** — "Oh Jehová, tú me has examinado y conocido."
Cada niño puede tener una tarjeta grande con su nombre y: "Dios me conoce."

### SEMANA 4 — MI VIDA TIENE VALOR

**"Soy valioso para Dios"**

Utilizar corazones de cartulina con los nombres de los niños.

Frases: "Dios me creó." · "Dios me conoce." · "Dios me ama." · "Mi vida tiene valor."
Todos: "¡Gracias, Dios, por crearnos!"

Versículo: **Salmo 8:5** — "Le has hecho poco menor que los ángeles, y lo coronaste de gloria y de honra."

## C. Decisiones abiertas

- **Reparto del 50 % restante del porcentaje de preparación.** Definido: examen 30 %, presentación 20 %.
  El resto (preparación y actividades obligatorias) está configurable en `src/config/preparationConfig.ts`
  y hoy lo recibe provisionalmente la lectura de la guía. Falta definir cómo se reparte.
- **Autenticación real.** El login actual es de interfaz (ver README). Requiere backend (Supabase) para
  contraseñas compartidas entre dispositivos, restablecimiento real y seguridad efectiva.
- **Navegación de las 52 semanas.** Fuera del Bloque 1 por indicación expresa; pendiente de su propio bloque.
- **Personajes en los documentos ya generados.** Las presentaciones, hojas de trabajo, hojas para colorear y
  tarjetas de versículo ya generadas conservan el personaje anterior. Los nuevos (niña y niño) están listos como
  componentes (`ChildGirl`, `ChildBoy`) y como imágenes en `public/personajes/` para regenerar esos materiales.

## D. Contenido redactado en el Bloque 1 que requiere revisión pastoral

Para completar los 23 apartados se redactaron, **sin añadir doctrina nueva**, estos textos metodológicos
(en `src/data/guideExtras.ts` y `src/data/guideSections.ts`):

- Transición entre la enseñanza y la dinámica (semanas 1–4).
- Indicaciones para usar el PowerPoint, la hoja de trabajo (con clave de respuestas) y el versículo para llevar a casa.
- Adaptación por edad 3–5, 5–7 y 8–10 años (la de 5–7 se redactó nueva; las de 3–4 y 8–10 ya existían y se conservan).
- "Objetivo de aprendizaje" (reformula la verdad central de cada semana en forma de meta del niño).

La base doctrinal de cada apartado 9 usa únicamente las afirmaciones ya definidas para cada semana.

## E. Cambios del Bloque "Fases A y B" que requieren revisión pastoral
- **Preguntas de relación** (1 por semana, `s{N}-q9` en `src/data/weeks/weekNN.ts`): los pares se tomaron literalmente de la
  base doctrinal ya definida de cada semana; conviene que el Pastor las revise.
- **Examen**: 2 intentos y cuenta el mejor (`src/config/examConfig.ts`); la primera respuesta de cada pregunta no se cambia.
- **Presentación (20 %)**: se calcula por diapositivas realmente proyectadas en la app (≥ 5 s cada una); abrir o descargar
  el archivo ya no suma.
