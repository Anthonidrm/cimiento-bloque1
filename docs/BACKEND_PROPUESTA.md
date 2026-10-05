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

## Reglas que aplica el servidor
- **Examen del maestro:** un solo intento; la primera respuesta es definitiva; el servidor califica (`exam_answer`).
- **Guía:** secuencial; ≥ 30 s por apartado; ≤ 60 s por llamada (`guide_add_seconds`).
- **Preparación:** guía 50 % (por apartados) · examen 30 % · presentación 20 % (por diapositivas usadas ≥ 5 s) (`teacher_prep`).
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
210 pruebas SQL (`supabase/tests/run.sh`) · 54 de integración y 77 de extremo a extremo (`supabase/tests/e2e.sh`).
Detalle en el README. Lo **no** probado: Supabase Auth real, Storage real (solo sus políticas en SQL), Edge Functions, envío de correo.

## Lo que sigue necesitando decisión o cuenta externa
Proyecto Supabase y primer Administrador · proveedor de correo · fuente oficial de los temas 5–52 · confirmar que el versículo completado
sirva de "examen" del estudiante · definir el peso de las actividades obligatorias en la preparación del maestro.
