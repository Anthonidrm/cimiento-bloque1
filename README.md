# CIMIENTO

Programa anual de formación bíblica infantil: **52 semanas** organizadas en **12 módulos**.
Estructura única: `Plan Anual → Módulo → Semana → Lección → Recursos`.

## Qué incluye hoy

- **Guía del Maestro** por lección (`/plan-anual/semana-N/guia`): 23 apartados con desbloqueo
  secuencial (30 segundos por apartado), progreso guardado por usuario, registro de cada visita
  (entrada, salida, tiempo, completado) y, al terminar, "Preparación completada" + "Imprimir lección".
  Versión imprimible (fondo blanco, los 23 apartados) y PDF descargable (`public/guias/`).
- **Porcentaje de preparación**: examen 30 % + presentación 20 % + 50 % restante (preparación y
  actividades obligatorias) **configurable y aún por definir** en `src/config/preparationConfig.ts`.
- **Examen del maestro** por lección, con historial completo de intentos y errores, por usuario.
- **Personajes oficiales**: `ChildGirl` y `ChildBoy` (`src/components/characters/`), con tamaño y
  poses (`stand`, `wave`, `cheer`, `point`). Imágenes SVG en `public/personajes/`.
- **Roles**: Administrador, Pastor, Maestro, Estudiante. **Sin sesión solo se ve `/login`** (y `/sobre-cimiento`); cada rol
  entra a su área al autenticarse.
- **Examen**: la primera respuesta queda registrada y no se cambia; intentos limitados; preguntas de relación.
- **Presentación**: se proyecta desde la app y el 20 % se calcula por uso real.

## Roles y acceso

| Rol | Acceso |
|---|---|
| Administrador | Todo, incluida la administración de usuarios y el restablecimiento de contraseñas |
| Pastor | Programa y administración educativa (no restablece contraseñas) |
| Maestro | Su área: guía, preparación, examen, su propio progreso |
| Estudiante | Únicamente su área de estudiante |

Usuarios iniciales (solo el nombre de acceso; las contraseñas **no** están en el código, solo su hash):
`admin`, `usuarios` (pastor), `lela`, `tefa`, `yely`, `mari`, `yeni`, `naty`, `nuna` (maestros) y `estudiante`.

### Límites de seguridad (importante)

CIMIENTO todavía no tiene servidor. Por eso el inicio de sesión es **control de acceso de la interfaz**, no
seguridad fuerte: las cuentas (con contraseñas protegidas por PBKDF2) viajan dentro de la aplicación, y los
cambios o restablecimientos de contraseña se guardan **solo en el navegador donde se hacen**. La autenticación
real, el restablecimiento entre dispositivos y la protección efectiva del contenido llegarán con el backend
(Supabase). Se recomienda cambiar las contraseñas iniciales en el primer ingreso.

## Arquitectura

```
Navegador (React + Vite)                         Supabase (cuando se configure)
  src/auth      login: Supabase Auth (con backend) o modo local      Auth ........ contraseñas con hash, sesiones
  src/backend   repositorios por dominio (el servidor decide)  ───►  PostgREST ... tablas con permisos por fila (RLS)
  src/components/panels, classroom, student   pantallas              Storage ..... buckets PRIVADOS (URL firmadas)
  src/services  caché local de la preparación del maestro            Edge Functions: admin-users, send-deliveries
```

- **Con backend** (variables definidas): la sesión viene de Supabase Auth y vive en memoria; el rol y los permisos los aplica la base de
  datos (RLS), no la pantalla. El progreso del maestro (guía, examen, presentación) se envía al servidor y se recupera al iniciar sesión
  (`src/backend/sync.ts`); `localStorage` queda solo como caché de lo propio.
- **Sin backend** (modo local): la app funciona como antes, pero las funciones multiusuario (asignar maestros, clases, asistencia, tareas,
  puntuación, coronas, recursos reemplazables, fotos, informes) **muestran "requiere backend" y NO se simulan** con datos del navegador.

## Instalación

```bash
npm ci
npm run dev        # http://localhost:5173
npx tsc -p tsconfig.app.json --noEmit && npm run build && npx oxlint
```

> Verificación de tipos: `npx tsc --noEmit` a secas no revisa nada (el `tsconfig.json` es de tipo "solución"); usar el comando de arriba.

## Variables de entorno

Ver `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_EMAIL_DOMAIN`. La clave `service_role` **nunca** va en el front.

## Supabase: puesta en marcha

1. Crear el proyecto y aplicar **en orden** `supabase/migrations/0001` … `0005` (SQL Editor o CLI) y las semillas `supabase/seed/01` … `03`.
2. Crear a mano el **primer Administrador**: Authentication → Add user (`admin@cimiento.app`, contraseña) y luego en el SQL Editor
   `insert into profiles(id, username, display_name, role, must_change_password) values ('<uuid del usuario>', 'admin', 'Administrador', 'ADMINISTRADOR', true);`
   (las Edge Functions necesitan que ya exista un Administrador).
3. Desplegar las funciones `supabase/functions/admin-users` y `send-deliveries` con sus secretos (ver el encabezado de cada una).
4. Definir las variables de entorno en Vercel (rama de prueba primero).
5. Migrar los archivos privados: `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npx tsx --tsconfig tsconfig.app.json tools/backend/subir_recursos.ts --subido-por <uuid-admin>`
   (con `--simular` solo muestra qué haría). Tras validar, **borrar a mano** `public/guias`, `public/recursos-semana-*` y `public/presentaciones`.
6. Correos de informe: `supabase/seed/report_recipients.sql.example` (ejecutar con las direcciones reales en el SQL Editor; no se guardan en el repo).
7. Alertas y recordatorios: activar `pg_cron` y programar `generate_assignment_alerts()` y `generate_reminders()` (comentado en `0004`).
8. Envío de correo real: proveedor (p. ej. Resend) + secretos de `send-deliveries`. Sin ello los informes quedan **en cola** y nada se marca como enviado.

Detalle de tablas, permisos y reglas: [`docs/BACKEND_PROPUESTA.md`](docs/BACKEND_PROPUESTA.md).

## Seguridad: qué está protegido y qué no

| | Con Supabase configurado | Sin backend (modo local) |
|---|---|---|
| Quién entra | Supabase Auth (contraseñas con hash en el servidor) | Control de **interfaz**: la sesión se puede suplantar editando el navegador |
| Qué ve cada rol | Lo decide la base de datos (RLS), probado con roles reales | Solo oculta pantallas |
| Calificación del examen del maestro | La hace el servidor; la primera respuesta es definitiva | Local |
| Archivos (guías, hojas, fotos, entregas) | Buckets privados con URL firmadas | `public/`: **abiertos por URL directa** |
| Claves del examen | **Siguen dentro del JavaScript público** de la app (el contenido aún no está en la base de datos) | Ídem |

No se considera segura la autenticación hasta migrar a Supabase Auth y borrar los archivos de `public/`.

## Pruebas

| Comando | Qué verifica |
|---|---|
| `NODE_OPTIONS="--import ./tools/pruebas/register.mjs" npx tsx --tsconfig tsconfig.app.json tools/pruebas/logica.ts` | guía, examen de un intento, preparación 50/30/20, presentación, autenticación local, acceso y juegos |
| ídem con `tools/pruebas/rutas.tsx` | qué ve cada rol en cada ruta (la app completa renderizada) |
| `supabase/tests/run.sh` | migraciones + permisos y reglas en PostgreSQL real |
| `supabase/tests/e2e.sh` | integración (repositorios reales con permisos reales) y **extremo a extremo** (la app en jsdom con login, aula, estudiante, recursos y sincronización) |

El extremo a extremo usa **simuladores** de Supabase Auth y Storage (`supabase/tests/proxy.mjs`) y no prueba Edge Functions: esas piezas no se han
probado contra un Supabase real. Requisitos: PostgreSQL local y el binario `postgrest` en el PATH.

## Materiales

`tools/materiales/` regenera presentaciones, hojas de trabajo, hojas para colorear, tarjetas de versículo y guías desde los datos de la app
(`./construir.sh`). Los personajes salen de `public/personajes/*.svg`.

## Despliegue

Vercel construye con `npm run build`. Trabaja en una **rama** (genera un Preview) y haz *merge* a `main` solo tras validar. No dejes
credenciales en el repositorio.

## Pendientes

Todos los requisitos de próximas fases están en [`docs/PENDIENTES_PROXIMAS_FASES.md`](docs/PENDIENTES_PROXIMAS_FASES.md).
Los modelos preparados (sin conectar) están en `src/domain/futureModels.ts`.

## Publicar (GitHub → Vercel)

1. Descomprime el ZIP.
2. En tu repositorio de GitHub: **Add file → Upload files** y arrastra el contenido de la carpeta `cimiento/`.
3. Si el repositorio conserva archivos antiguos que ya no existen en el ZIP, bórralos desde GitHub.
4. **Commit changes** a `main`. Vercel publica solo en 1–2 minutos.

## Estructura

```
src/
  auth/         sesión, hash PBKDF2, roles, protección de rutas
  components/   Header, Footer, characters/, PreparationPanel, GuideBlocks, PrintableWeekGuide, ...
  config/       preparationConfig.ts (pesos del porcentaje)
  data/         modules.ts, weeks/week01–04.ts, guideExtras.ts, guideSections.ts (23 apartados)
  domain/       futureModels.ts (próximas fases)
  pages/        Home, AnnualPlan, WeekDetail, GuidePrep, WeekExam, ExamReview, Login, Account,
                Admin, StudentHome, TeacherArea, Progress, Resources, About
  services/     guidePrepService, preparationService, examService, weekService, resourceService
public/
  recursos-semana-1..4/  presentación, hoja de trabajo, hoja para colorear, versículo RVR1960
  guias/                 guía del maestro en PDF (semanas 1–4)
  personajes/            niña y niño (SVG)
docs/PENDIENTES_PROXIMAS_FASES.md
```

> Nota técnica: las rutas usan `/:weekSlug` (por ejemplo `semana-3`) y se interpretan en
> `src/utils/weekParam.ts`. React Router no admite parámetros parciales como `semana-:week`.
