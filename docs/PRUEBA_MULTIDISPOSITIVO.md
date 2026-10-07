# Prueba de CIMIENTO desde varios dispositivos (con Supabase real)

Haz esta lista **después** de configurar Supabase y Vercel (README). Usa dos navegadores distintos (o PC + teléfono) abiertos a la vez.
La columna **Auto** indica qué ya está cubierto por pruebas automáticas (que usan simuladores de Auth y Storage): ✔ cubierto de punta a punta ·
◐ cubierto en parte · ✘ solo se puede comprobar aquí, a mano.

| # | Qué hacer | Qué debe pasar | Auto |
|---|---|---|---|
| 0 | Entra como Administrador → **Administración → Diagnóstico** | «Todo lo obligatorio está correcto» y *Probar la función* confirma `admin-users` con el mismo dominio | ✔ (Supabase real ✘) |
| 1 | Entra como Administrador (primer acceso) | Te obliga a definir tu contraseña antes de usar nada | ✔ |
| 2 | *Usuarios*: crea un **Pastor** | Aparece activo; el Pastor entra y debe definir su contraseña | ◐ |
| 3 | Crea un **Maestro** | Idem | ◐ |
| 4 | Crea 2 **Estudiantes** | Idem | ◐ |
| 5 | *Grupos*: crea «Grupo A», pon a los 2 estudiantes y al maestro | El maestro verá a esos estudiantes en su lista de clase | ◐ |
| 6 | *Asignaciones*: asigna el maestro a la **Semana 1** | Muestra «MAESTRO ASIGNADO: nombre» y el estado (a tiempo / atrasada) | ✔ |
| 7 | Navegador B: entra como **Maestro** | Ve «Mis lecciones asignadas» con la Semana 1 y solo su progreso | ✔ |
| 8 | Semana 1 → **Guía**: recorre los 23 apartados (≥ 30 s cada uno) | Se desbloquean en orden; «Preparación completada» | ◐ (el temporizador de 30 s solo a mano) |
| 9 | **Presentación** → «Proyectar en la aplicación»: pasa las 9 diapositivas (≥ 5 s cada una) | Sube el uso (X de 9) | ◐ |
| 10 | **Examen** (un solo intento): responde las 9 preguntas | La primera respuesta es definitiva; muestra la correcta y la explicación | ◐ |
| 11 | *Aula*: **INICIAR CLASE** | Arranca el temporizador (si falta guía o examen, el servidor lo impide) | ✔ |
| 12 | **Pase de lista**: marca a todos | Presente / Ausente / Excusa guardados | ✔ |
| 13 | **Participación** de un estudiante (0–25) | Queda guardada | ✔ |
| 14 | **FINALIZAR CLASE** | Informe de clase generado (duración, asistencia, observaciones) | ✔ |
| 15 | Verifica la evaluación del maestro (*Progreso de maestros*) | Guía 45 · Examen 25 · Presentación 15 · Clase 7,5 · Lista 7,5 = hasta 100 % | ✔ |
| 16 | *Aula*: **actividad de integración** (asigna estudiantes; en la **Semana 2** el maestro registra quién participó de la Semana 1) | Se registra la participación | ◐ |
| 17 | Navegador C (otro dispositivo): entra como **Estudiante** | Ve sus coronas 👑, puntos y resultados — y **solo los suyos** | ◐ |
| 18 | Compara lo que ve el estudiante en el dispositivo B y en C | Son exactamente los mismos datos | ✔ |
| 19 | *Recursos*: sube y **reemplaza** un archivo; ábrelo como maestro y como estudiante | Reemplazar no duplica; se abre con enlace temporal; el estudiante no ve lo de maestros | ✔ (Storage real ✘) |
| 20 | *Progreso de maestros / estudiantes* como Pastor y Administrador | Muestran lo anterior; el maestro solo ve a sus estudiantes | ✔ |
| 21 | *Historial de cambios* | Quedan registrados los cambios (quién y cuándo), sin contraseñas | ✔ |

**Importante:** las actividades de integración (paso 16) **no** forman parte del 15 % de la evaluación del maestro.

Si algo falla, copia el mensaje exacto de la pantalla y la fila que falla del **Diagnóstico**.
