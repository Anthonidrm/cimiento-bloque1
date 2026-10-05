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

## Herramientas y pruebas

- `tools/materiales/` — regenera presentaciones, hojas de trabajo, hojas para colorear, tarjetas de versículo y guías en PDF
  a partir de los datos de la app (`./construir.sh`). No afecta al build de la app.
- `tools/pruebas/` — pruebas de lógica y de rutas por rol (ver el encabezado de cada archivo).
- `supabase/` — **propuesta** de base de datos y permisos (no aplicada) con 71 pruebas contra PostgreSQL
  (`supabase/tests/run.sh`). Ver [`docs/BACKEND_PROPUESTA.md`](docs/BACKEND_PROPUESTA.md).

> Verificación de tipos: usar `npx tsc -p tsconfig.app.json --noEmit` (o `npm run build`). `npx tsc --noEmit` a secas no
> revisa nada porque `tsconfig.json` es de tipo "solución".

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
