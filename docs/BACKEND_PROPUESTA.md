# Propuesta de backend (Supabase) — CIMIENTO

Estado: **propuesta validada, no aplicada.** No se ha creado ningún proyecto Supabase ni se ha modificado ninguna
base de datos. La migración [`supabase/migrations/0001_cimiento_base.sql`](../supabase/migrations/0001_cimiento_base.sql)
solo **crea** objetos nuevos (nada destructivo) y se probó en un PostgreSQL real con
[`supabase/tests/run.sh`](../supabase/tests/run.sh): **71 pruebas de permisos, todas correctas**.

## Por qué hace falta
Hoy todo el progreso vive en el `localStorage` de cada navegador y la sesión se puede suplantar editándolo. Eso impide
lo central del sistema: **información compartida entre usuarios** (el Pastor ve a los maestros, el maestro ve a sus
estudiantes…) y permisos reales. Las funciones marcadas "Requiere backend" en los paneles dependen de esto y **no se
simularon con `localStorage`**.

## Autenticación
- **Supabase Auth** guarda las contraseñas con hash (nunca en tablas propias). `profiles` solo guarda el perfil y el rol.
- Acceso por **nombre de usuario**: internamente se mapea a un correo (`usuario@…`) para `signInWithPassword`.
- **Administrador**: crear usuario, cambiar rol, activar/desactivar (`profiles.active` + bloqueo en Auth), quitar acceso,
  cambiar y restablecer contraseña (sin ver nunca la actual). Estas acciones requieren la clave `service_role`, que **solo
  puede vivir en una Edge Function** (`admin-users`), jamás en el navegador. El **Pastor no** tiene acceso a ellas.
- **Estudiante, primer acceso**: `profiles.must_change_password = true` obliga a definir su contraseña al entrar.
- Cada usuario cambia su propia contraseña con la API de Auth.

## Tablas (resumen)
| Área | Tablas |
|---|---|
| Usuarios y roles | `profiles` (rol, activo), `app_config` |
| Lecciones | `lessons` (52 filas, módulo 1–12; título vacío = tema aún no cargado), `student_groups`, `enrollments` |
| Maestros | `teacher_assignments` (+ `teacher_assignment_history`), vista `v_assignment_status`, `generate_assignment_alerts()` |
| Clases | `class_sessions`, `class_reports`, funciones `start_class()` / `end_class()` |
| Preparación | `guide_progress`, `guide_visits`, `exam_attempts`, `exam_answers` (inmutable), `presentation_usage`, `teacher_prep()` |
| Estudiantes | `attendance`, `assignments`, `submissions`, `mandatory_activities`, `activity_completions`, `lesson_scores` (4×25) |
| Integración | `integration_activities`, `integration_participations`, `crowns` (corona automática) |
| Recursos | `resources` (único por lección+tipo+ranura), `resource_versions` (reemplazar = nueva versión) |
| Otros | `class_photos`, `notifications` (canal APP activo; correo/WhatsApp reservados), `games` |

## Reglas que ya están en la base de datos (y probadas)
- **Asignación de maestros**: Administrador y Pastor asignan, cambian y quitan; cada cambio queda en el historial.
  Estado **A_TIEMPO** (mismo día de la clase anterior o antes), **FUERA_DE_TIEMPO** (con días de atraso) y **ATRASADA**
  (sin maestro pasadas 4 horas del inicio de la clase anterior, con días de atraso). La alerta a Pastor y Administrador se
  genera una sola vez por lección (`generate_assignment_alerts()`, a programar con pg_cron o una Edge Function).
- **Iniciar clase**: solo el maestro asignado, y solo con guía completa y examen realizado; si no cumple, Administrador o
  Pastor pueden iniciarla. Una sola clase abierta por lección. **Finalizar** guarda hora final, duración, informe y
  notifica a Pastor y Administrador.
- **Preparación**: guía 50 % (por apartados completados), examen 30 %, presentación 20 % (por diapositivas realmente
  proyectadas). Pesos y umbrales en `app_config`.
- **Examen**: la primera respuesta queda y no se puede modificar ni borrar (política + disparador).
- **Tareas**: el estudiante entrega solo desde el inicio de la clase hasta el inicio de la próxima; lo entregado se
  conserva (no se edita ni se borra); el maestro asignado ve, comenta y califica; otros maestros y estudiantes no ven nada.
- **Coronas**: cuando el maestro de la lección **siguiente** registra la participación, se suma una corona.
- **Recursos**: Administrador y Pastor agregan, reemplazan y eliminan sin duplicar; el estudiante no ve guía ni presentación.

## Matriz de permisos
| | Administrador | Pastor | Maestro | Estudiante |
|---|---|---|---|---|
| Usuarios, roles, contraseñas | escribe | solo lee nombres | — | — |
| Asignar / cambiar maestro | ✔ | ✔ | — | ve el asignado |
| Progreso de maestros | ve todo | ve todo | solo el suyo | — |
| Iniciar / finalizar clase | ✔ (si el maestro no cumple) | ✔ (ídem) | solo el asignado y preparado | — |
| Pase de lista | ✔ | ✔ | solo en su clase | ve la suya |
| Entregar tarea | — | — | define y califica | solo en la ventana |
| Recursos | ✔ | ✔ | lee los suyos | lee los de estudiante |
| Configuración | ✔ | lee | lee | lee |

## Almacenamiento de archivos (pendiente, necesario para proteger contenido)
Hoy los PDF/PPT de `public/` se abren por URL directa. Propuesta: tres *buckets* **privados** de Supabase Storage
(`recursos`, `entregas`, `fotos`) con URL firmadas y políticas por rol. Con eso la guía y los recursos dejan de ser
públicos y "Reemplazar recurso" funciona desde la aplicación sin tocar código.

## Plan de integración en la app (incremental)
Los servicios actuales (`examService`, `guidePrepService`, `presentationService`, `preparationService`, `authService`)
aíslan la persistencia: se cambia **la implementación detrás de las mismas funciones**, sin tocar las pantallas.
1. Autenticación real (Auth + `profiles` + Edge Function `admin-users`) y paneles de Administración y Pastor.
2. Preparación y examen en base de datos (el Pastor y el Administrador ya ven el progreso).
3. Asignación de maestros y alertas.
4. Clases: iniciar/finalizar, temporizador, pase de lista, informe.
5. Tareas, actividades, puntuación y coronas.
6. Recursos y fotos en Storage.
7. Área del estudiante, notificaciones y juegos.

## Lo que necesito para continuar
- Un proyecto Supabase (URL y *anon key*; la `service_role` solo como secreto de la Edge Function).
- Confirmar el nombre de acceso ↔ correo interno y el flujo del primer acceso del estudiante.
- Correos de reporte de Pastor y Administrador, cargados en `app_config.report_recipients` desde el panel SQL (no en el repositorio).
- Un proveedor de correo real (SMTP/Resend) si se quiere enviar informes: **no se simula el envío** (`sent_to_*` queda vacío).
- La fuente oficial de los temas de las semanas 5–52.
