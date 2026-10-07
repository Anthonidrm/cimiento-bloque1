# Backend (Supabase) — CIMIENTO

**Estado:** diseñado, implementado en la app y probado contra PostgreSQL + PostgREST reales. **No está aplicado a ningún proyecto
Supabase** (no existe la cuenta todavía). Auth y Storage se probaron con **simuladores**; las Edge Functions están escritas y revisadas
pero **no probadas**. Nada de lo multiusuario se simula con `localStorage`.

## Migraciones (solo crean objetos; ninguna borra nada)
| Archivo | Contenido |
|---|---|
| `0001_cimiento_base.sql` | Usuarios y roles, lecciones (52), grupos, asignación de maestros con historial y estado (a tiempo / fuera de tiempo / atrasada), clases, preparación del maestro, examen, asistencia, tareas, actividades, integración, coronas, recursos con versiones, fotos, notificaciones, juegos; RLS por rol |
| `0002_cimiento_integral.sql` | Módulos, claves del examen **ocultas** (el servidor califica), guía secuencial y presentación escritas por el servidor, puntuación 4×25 automática, calificación de tareas por función, actividades obligatorias y de integración, juegos y resultados, notificaciones + cola de correo, informe de clase, vistas de progreso (`v_teacher_progress`, `v_student_progress`, `v_sessions`, `v_lessons`) |
| `0003_cimiento_storage.sql` | Buckets privados `recursos`, `entregas`, `fotos` y sus políticas por rol |
| `0004_cimiento_acceso_y_auditoria.sql` | `complete_first_access()` (primer acceso), `change_log` + disparadores (historial de cambios), programación de alertas (pg_cron, comentada) |
| `0005_cimiento_reemplazo_recursos.sql` | Corrige que el Pastor no podía reemplazar recursos subidos por otra persona |
| `0006_cimiento_pesos_preparacion.sql` | Pesos de preparación 45/25/15/15 (siempre suman 100). Su definición de "actividades obligatorias" quedó superada por la 0007 |
| `0007_cimiento_actividades_obligatorias_maestro.sql` | Las actividades obligatorias DEL MAESTRO (15 %): inicio y finalización de clase + pase de lista. `ended_by` en las clases, `teacher_prep` y `v_teacher_progress` con esos dos componentes |

Semillas (`supabase/seed/`): títulos de lecciones y claves del examen (generadas desde los datos de la app), juegos del versículo,
y un ejemplo de destinatarios de informes (las direcciones reales **no** se guardan en el repositorio).

## Autenticación
- **Supabase Auth** guarda las contraseñas con hash; `profiles` guarda perfil y rol. Acceso por nombre de usuario → correo interno
  (`usuario@VITE_AUTH_EMAIL_DOMAIN`).
- Con backend la sesión vive **en memoria** (no se lee de `localStorage`); el rol sale de `profiles` en el servidor.
- **Primer acceso:** `must_change_password` obliga a definir la contraseña antes de usar la app (`complete_first_access()`).
- **Administrador** (Edge Function `admin-users`, única que usa `service_role`): crear usuario, cambiar rol, activar/desactivar,
  quitar acceso, restablecer contraseña temporal. Nunca ve la contraseña actual. **El Pastor no puede.**

## Permisos por rol
| | Administrador | Pastor | Maestro | Estudiante |
|---|---|---|---|---|
| Usuarios, roles, contraseñas | ✔ | solo lee nombres | — | — |
| Asignar / cambiar / quitar maestro | ✔ | ✔ | — | ve el asignado |
| Progreso de maestros | todo | todo | solo el suyo | — |
| Progreso de estudiantes | todo | todo | solo sus estudiantes | solo el suyo |
| Iniciar / finalizar clase | ✔ (excepción) | ✔ (excepción) | el asignado, si está preparado | — |
| Pase de lista, participación, tareas, actividades | ✔ | ve | en su clase | ve lo suyo |
| Entregar tarea / actividades / juegos | — | — | — | dentro de la ventana |
| Recursos: agregar / reemplazar / eliminar | ✔ | ✔ | lee los suyos | lee los de estudiante |
| Fotos | sube | sube | sube | ve las de su grupo |
| Historial de cambios | ✔ | ✔ | — | — |

## Dos tipos de actividades distintos (no mezclar)
| | Actividades **obligatorias del maestro** | **Actividades de integración** |
|---|---|---|
| Qué son | Inicio y finalización de clase · Pase de lista | Actividades de los estudiantes de cada semana (p. ej. "Mira lo que Dios creó", "Dios me hizo especial") |
| Quién las hace | El maestro | Los estudiantes; el maestro de la lección siguiente registra quién participó |
| Efecto | 15 % de la preparación del maestro | Corona 👑 y puntos del estudiante |
| Tablas | `class_sessions`, `attendance` | `integration_activities`, `integration_assignments`, `integration_participations`, `crowns` |

Las "actividades de la lección" (`mandatory_activities`, con evidencia, que el estudiante completa) son un tercer mecanismo del estudiante y **tampoco** cuentan para el 15 %.

## Reglas que aplica el servidor
- **Examen del maestro:** un solo intento; la primera respuesta es definitiva; el servidor califica (`exam_answer`).
- **Guía:** secuencial; ≥ 30 s por apartado; ≤ 60 s por llamada (`guide_add_seconds`).
- **Preparación del maestro (suma exactamente 100 %):** guía 45 % (por apartados) · examen 25 % · presentación 15 % (por diapositivas usadas ≥ 5 s) · **actividades obligatorias del maestro 15 %** (`teacher_prep`). La base de datos rechaza pesos que no sumen 100.
  - **Inicio y finalización de clase (7,5):** el maestro asignado inició **y** finalizó la clase él mismo (`started_by` y `ended_by`). Si lo hace el Administrador/Pastor como excepción, el maestro no recibe el crédito.
  - **Pase de lista (7,5):** el maestro registró asistencia (Presente / Ausente / Excusa) de **todos** los estudiantes de la lista de la clase (los del grupo de la sesión; sin grupo, los de los grupos que enseña). Una lista vacía no cuenta.
  - El reparto es `app_config.prep_mandatory_split` (50/50, suma 100).
- **Asignación:** estado y días de atraso en `v_assignment_status`; alerta a Pastor y Administrador pasadas 4 h sin maestro.
- **Iniciar clase:** solo el maestro asignado y con guía completa + examen; excepción de Administrador/Pastor.
- **Tareas:** entrega solo desde el inicio de la clase hasta el inicio de la próxima; lo entregado se conserva.
- **Puntuación:** asistencia 25 + asignación 25 + participación 25 + examen 25 = 100, calculada automáticamente.
- **Coronas:** las suma el servidor cuando el maestro de la lección **siguiente** registra la participación.
- **Recursos:** únicos por (lección, tipo, ranura); reemplazar = nueva versión vigente, la anterior se conserva.
- **Correo:** el informe de clase se deja **en cola** (`notification_deliveries`); solo el servicio de envío marca "ENVIADA".

## Almacenamiento privado
Rutas convenidas (las usan las políticas): `recursos/{audiencia}/{semana}/{tipo}/{ranura}/{marca}-{archivo}`,
`entregas/{tarea}/{estudiante}/{marca}-{archivo}`, `fotos/{semana}/{sesión|sin-clase}/{marca}-{archivo}`.
Migración desde `public/`: `tools/backend/subir_recursos.ts` (60 archivos: 4 guías, 20 materiales, 36 diapositivas).

## Pruebas
242 pruebas SQL (`supabase/tests/run.sh`) · 61 de integración y 89 de extremo a extremo (`supabase/tests/e2e.sh`).
Detalle en el README. Lo **no** probado: Supabase Auth real, Storage real (solo sus políticas en SQL), Edge Functions, envío de correo.

## Lo que sigue necesitando decisión o cuenta externa
Proyecto Supabase y primer Administrador · proveedor de correo · fuente oficial de los temas 5–52 · confirmar que el versículo completado
sirva de "examen" del estudiante · confirmar los criterios del 15 % (ver arriba).
