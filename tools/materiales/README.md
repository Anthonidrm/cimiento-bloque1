# Generadores de materiales de CIMIENTO

Regeneran los materiales imprimibles de las semanas desarrolladas **a partir de los datos reales de la app**
(`src/data/…`), de modo que texto y PDF no se desfasen:

| Material | Script |
|---|---|
| Presentación (PPT + PDF, 9 diapositivas para proyectar) | `presentaciones.js` |
| Hoja de trabajo (5–10 años) | `hojas_trabajo.py` |
| Hoja para colorear (3–5 años, blanco y negro) | `hojas_colorear.py` + `dibujos.py` |
| Tarjeta de versículo RVR1960 | `tarjetas_versiculo.py` |
| Guía del Maestro en PDF (23 apartados) | `guias_pdf.py` |

Los personajes salen de `public/personajes/*.svg` (los mismos que usa la app): si se cambia un personaje,
basta con volver a ejecutar `./construir.sh`.

```bash
cd tools/materiales && ./construir.sh   # desde la raíz del repo, con las dependencias instaladas
```

Esta carpeta es independiente de la aplicación: Vercel no la usa y no afecta al build (`out/` no se versiona).
