# CIMIENTO

Programa anual de formación bíblica infantil: **52 semanas** organizadas en **12 módulos**.
Estructura única: `Plan Anual → Módulo → Semana → Lección → Recursos`.

## Qué incluye hoy

- **Guía del Maestro** por lección (`/plan-anual/semana-N/guia`): 23 apartados con desbloqueo
  secuencial (30 segundos por apartado), progreso guardado por usuario, registro de cada visita
  (entrada, salida, tiempo, completado) y, al terminar, "Preparación completada" + "Imprimir lección".
  Versión imprimible (fondo blanco, los 23 apartados) y PDF descargable (`public/guias/`).
- **Porcentaje de preparación del maestro** (suma exactamente 100 %): guía 45 % + examen 25 % + presentación 15 % +
  **actividades obligatorias del maestro 15 %**. Estas son **dos**: **inicio y finalización de clase** y **pase de lista** (7,5 % cada una).
  Pesos en `src/config/preparationConfig.ts` y en `app_config` del servidor (la base de datos rechaza pesos que no sumen 100).
  No incluyen las actividades de los estudiantes ni las **actividades de integración** (módulo independiente con sus coronas).
- **Examen del maestro** por lección, con historial completo de intentos y errores, por usuario.
- **Personajes oficiales**: `ChildGirl` y `ChildBoy` (`src/components/characters/`), con tamaño y
  poses (`stand`, `wave`, `cheer`, `point`). Imágenes SVG en `public/personajes/`.
- **Roles**: Administrador, Pastor, Maestro, Estudiante. **Sin sesión solo se ve `/login`** (y `/sobre-cimiento`); cada rol
  entra a su área al autenticarse.
- **Examen**: la primera respuesta queda registrada y no se cambia; intentos limitados; preguntas de relación.
- **Presentación**: se proyecta desde la app y el 15 % se calcula por uso real.

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
Navegador (React + Vite)                         Supabase (real)
  src/auth      login: Supabase Auth (con backend) o modo local      Auth ........ contraseñas con hash, sesiones
  src/backend   repositorios por dominio (el servidor decide)  ───►  PostgREST ... tablas con permisos por fila (RLS)
  src/components/panels, classroom, student   pantallas              Storage ..... buckets PRIVADOS (URL firmadas)
  src/services  caché local de la preparación del maestro            Edge Functions: admin-users, send-deliveries
```

- **Con backend** (variables definidas): el login es Supabase Auth; el rol y los permisos los aplica la base de datos (RLS), no la pantalla. El progreso del maestro (guía, examen, presentación) se envía al servidor y se recupera al iniciar sesión
  (`src/backend/sync.ts`); `localStorage` queda solo como caché de lo propio.
- **Sin backend** (solo `npm run dev`): modo local de desarrollo con usuarios de ejemplo; en una publicación NO se ofrece (aparece «Falta configurar el servidor»). Las funciones multiusuario (asignar maestros, clases, asistencia, tareas,
  puntuación, coronas, recursos reemplazables, fotos, informes) **muestran "requiere backend" y NO se simulan** con datos del navegador.

## Instalación

```bash
npm ci
npm run dev        # http://localhost:5173
npx tsc -p tsconfig.app.json --noEmit && npm run build && npx oxlint
```

> Verificación de tipos: `npx tsc --noEmit` a secas no revisa nada (el `tsconfig.json` es de tipo "solución"); usar el comando de arriba.

## Variables de entorno

| Variable | Dónde | Obligatoria | Para qué |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Vercel (Production **y** Preview) | sí | URL del proyecto, p. ej. `https://abcd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Vercel (Production **y** Preview) | sí | clave **anon** pública (la protegen los permisos de la base de datos) |
| `VITE_AUTH_EMAIL_DOMAIN` | Vercel | no (por defecto `cimiento.app`) | dominio interno que convierte el usuario `lela` en `lela@cimiento.app`; debe ser **igual** al `AUTH_EMAIL_DOMAIN` de la función `admin-users` |
| `VITE_ALLOW_LOCAL_MODE` | solo desarrollo | no | permite el modo local de prueba en una publicación (no recomendado) |

La clave `service_role` **nunca** va en Vercel ni en el repositorio: solo existe dentro de Supabase (las funciones de servidor la reciben automáticamente).
Sin las dos primeras variables, una **publicación** muestra «Falta configurar el servidor» (no ofrece un modo de prueba que parezca real); el modo local solo funciona con `npm run dev`.

## Supabase: puesta en marcha paso a paso (sin instalar nada; todo desde el navegador)

1. **Crear el proyecto.** supabase.com → *New project* (guarda la contraseña de la base de datos).
2. **Autenticación.** *Authentication → Sign In / Providers → Email*: habilitado. **Desactiva «Allow new users to sign up»** (solo el Administrador crea usuarios).
3. **Base de datos.** *SQL Editor*: pega el archivo completo `supabase/despliegue/1_migraciones.sql` y pulsa *Run* **una sola vez** (corre en una transacción: si falla, no queda nada a medias). Después pega y ejecuta `supabase/despliegue/2_semillas.sql`.
4. **Primer Administrador.** *Authentication → Users → Add user → Create new user*: email `admin@cimiento.app`, una contraseña temporal y marca **Auto Confirm User**. Luego ejecuta en el SQL Editor `supabase/despliegue/3_primer_administrador.sql` (en el primer acceso la aplicación te obliga a cambiar esa contraseña).
5. **Copiar las claves.** *Project Settings → API*: copia **Project URL** y la clave **anon public** (NO la `service_role`).
6. **Función de servidor `admin-users`** (crear usuarios, roles, activar/desactivar, restablecer contraseñas). *Edge Functions → Deploy a new function → Via Editor*: nombre `admin-users`, pega `supabase/functions/admin-users/index.ts`, *Deploy*. Deja activada la verificación de JWT. Los secretos `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen dentro de las funciones. Solo si usas otro dominio de correo interno: *Secrets* → `AUTH_EMAIL_DOMAIN`.
7. **Almacenamiento privado.** Lo crean las migraciones (buckets `recursos`, `entregas`, `fotos`, todos privados). Compruébalo en *Storage*.
8. **Verificar.** Entra a la aplicación como Administrador → **Administración → Diagnóstico**: debe decir «Todo lo obligatorio está correcto» y *Probar la función* debe confirmar `admin-users`.
9. **Cargar los materiales (recursos privados).** *Administración → Recursos → Agregar / reemplazar*: sube cada archivo (presentación, hoja de trabajo, hoja para colorear, tarjeta de versículo, guía) de las semanas 1–4. Las 36 imágenes de las diapositivas (tipo *Imagen*, ranura `diapositiva-1` … `diapositiva-9`) son opcionales para empezar: mientras no estén, el visor usa la copia de `public/`. Con Node instalado se puede hacer todo de una vez: `tools/backend/subir_recursos.ts` (usa la clave de servicio **solo en tu equipo**; con `--simular` solo muestra lo que haría). Cuando todo esté subido y verificado, **borra a mano** `public/guias`, `public/recursos-semana-*` y `public/presentaciones` para que ya no haya copias públicas.

**Opcionales (la aplicación funciona sin ellos):**
- **Correos de informe.** Ejecuta en el SQL Editor `supabase/seed/report_recipients.sql.example` con las direcciones reales (no se guardan en el repositorio). Sin un proveedor de correo los informes **quedan en cola** («En cola (sin enviar)»): nada se marca como enviado. El envío real requiere desplegar `supabase/functions/send-deliveries` con los secretos `RESEND_API_KEY`, `MAIL_FROM` y `CRON_SECRET` y programarla.
- **Alertas y recordatorios.** *Database → Extensions → pg_cron*, y en el SQL Editor: `select cron.schedule('cimiento-alertas-asignacion', '*/30 * * * *', $$ select generate_assignment_alerts() $$);` y `select cron.schedule('cimiento-recordatorios', '0 13 * * *', $$ select generate_reminders() $$);`

*Con la CLI de Supabase (opcional):* `supabase link`, `supabase db push`, `supabase functions deploy admin-users` (hay un `supabase/config.toml`; no se ha probado con la CLI real).

## Vercel

Se recomienda un proyecto **nuevo y separado** del actual, para no tocar la publicación vigente:
1. Vercel → *Add New → Project* → importa el mismo repositorio de GitHub. *Framework*: Vite; *Build Command*: `npm run build`; *Output Directory*: `dist` (ya viene así).
2. *Settings → Environment Variables*: agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (y `VITE_AUTH_EMAIL_DOMAIN` solo si cambiaste el dominio) marcando **Production y Preview**.
3. *Settings → Git → Production Branch*: `feature/sistema-integral-fase-a-b` (o cualquier otra rama de prueba; **no** `main` hasta validar).
4. *Deployments → Redeploy*: las variables se incorporan al **construir**; si las cambias, vuelve a desplegar.
5. En *Supabase → Authentication → URL Configuration* pon como *Site URL* la dirección que te dio Vercel.

La aplicación no usa ninguna dirección fija (`localhost` o similar): todo sale de las variables de entorno.

## Entrar desde otro dispositivo

Abre la dirección de Vercel en el otro PC o en el teléfono (necesitas conexión a internet) e inicia sesión con el **usuario** (p. ej. `admin`) y su contraseña: los datos viven en Supabase, así que todos los dispositivos ven lo mismo. Cada usuario nuevo entra con la contraseña temporal que le dio el Administrador y debe definir la suya en el primer acceso. La sesión se guarda por navegador; «Salir» la cierra. Lista completa de verificación: [`docs/PRUEBA_MULTIDISPOSITIVO.md`](docs/PRUEBA_MULTIDISPOSITIVO.md).

## Seguridad: qué está protegido y qué no

| | Con Supabase configurado | Sin backend (modo local) |
|---|---|---|
| Quién entra | Supabase Auth (contraseñas con hash en el servidor; la app solo guarda el token de sesión que emite Supabase, que no se puede falsificar) | Control de **interfaz**: la sesión se puede suplantar editando el navegador |
| Qué ve cada rol | Lo decide la base de datos (RLS), probado con roles reales | Solo oculta pantallas |
| Calificación del examen del maestro | La hace el servidor; la primera respuesta es definitiva | Local |
| Archivos (guías, hojas, fotos, entregas) | Buckets privados con URL firmadas | `public/`: **abiertos por URL directa** |
| Claves del examen | **Siguen dentro del JavaScript público** de la app (el contenido aún no está en la base de datos) | Ídem |

Mientras queden copias en `public/` (guías, hojas, presentaciones) esos archivos siguen abiertos por URL directa: bórralas tras migrar los recursos a Storage (paso 9). Nada de lo probado hasta hoy se ha ejecutado contra un Supabase real: ver el apartado «Qué falta verificar».

## Pruebas

| Comando | Qué verifica |
|---|---|
| `NODE_OPTIONS="--import ./tools/pruebas/register.mjs" npx tsx --tsconfig tsconfig.app.json tools/pruebas/logica.ts` | guía, examen de un intento, preparación 50/30/20, presentación, autenticación local, acceso y juegos |
| ídem con `tools/pruebas/rutas.tsx` | qué ve cada rol en cada ruta (la app completa renderizada) |
| `supabase/tests/run.sh` | migraciones + permisos y reglas en PostgreSQL real |
| `supabase/tests/e2e.sh` | archivos de despliegue y semillas al día · integración (repositorios reales con permisos reales) · **extremo a extremo** (la app en jsdom: login, aula, estudiante, recursos, sincronización, diagnóstico) · **función de servidor `admin-users` (su código real)** |

El extremo a extremo usa **simuladores** de Supabase Auth y Storage (`supabase/tests/proxy.mjs`) y no prueba Edge Functions: esas piezas no se han
probado contra un Supabase real. Requisitos: PostgreSQL local y el binario `postgrest` en el PATH.

## Materiales

`tools/materiales/` regenera presentaciones, hojas de trabajo, hojas para colorear, tarjetas de versículo y guías desde los datos de la app
(`./construir.sh`). Los personajes salen de `public/personajes/*.svg`.

## Despliegue y verificación

Orden: Supabase (pasos 1–8) → Vercel → **Diagnóstico** → prueba multidispositivo. Trabaja siempre en una **rama** de prueba y haz *merge* a `main` solo
tras validar. No dejes credenciales en el repositorio (`.gitignore` bloquea `PRIVADO_*`, `.env*` y `*.pem`).

### Qué falta verificar (única parte que depende de tu proyecto Supabase real)
Todo se ha probado contra PostgreSQL real y contra el código real de la app y de la función `admin-users`, pero **Supabase Auth, Storage y las Edge Functions
reales nunca se han ejecutado** (en las pruebas se usan simuladores solo de esas tres piezas). El **Diagnóstico** y la lista de
[`docs/PRUEBA_MULTIDISPOSITIVO.md`](docs/PRUEBA_MULTIDISPOSITIVO.md) sirven para confirmarlo.

## Pendientes

Todos los requisitos de próximas fases están en [`docs/PENDIENTES_PROXIMAS_FASES.md`](docs/PENDIENTES_PROXIMAS_FASES.md).
Los modelos preparados (sin conectar) están en `src/domain/futureModels.ts`.

## Publicar (GitHub → Vercel)

Sube la rama a GitHub (en la web: *Add file → Upload files* y elige **Create a new branch**; no `main`). Vercel crea el despliegue de esa rama
(ver «Vercel» arriba para variables y rama de producción del proyecto de prueba).

## Estructura

```
src/
  auth/         sesión, hash PBKDF2, roles, protección de rutas
  components/   Header, Footer, characters/, PreparationPanel, GuideBlocks, PrintableWeekGuide, ...
  config/       preparationConfig.ts (pesos del porcentaje), examConfig.ts, presentationConfig.ts
  backend/      repositorios Supabase por dominio (people, classes, teaching, prep, students, resources, health, sync)
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
