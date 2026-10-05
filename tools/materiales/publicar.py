"""Copia los materiales generados (out/) a public/ reemplazando los de la misma semana (sin duplicar)."""
import os, shutil
import common as C

n_ok = 0
for n in (1, 2, 3, 4):
    d = os.path.join(C.PUB, f"recursos-semana-{n}")
    os.makedirs(d, exist_ok=True)
    for src, dst in [(f"presentacion-semana-{n}.pdf", d), (f"presentacion-semana-{n}.pptx", d), (f"hoja-trabajo-semana-{n}.pdf", d),
                     (f"colorear-semana-{n}.pdf", d), (f"versiculo-semana-{n}.pdf", d), (f"guia-semana-{n}.pdf", os.path.join(C.PUB, "guias"))]:
        s = os.path.join(C.OUT, src)
        assert os.path.exists(s), f"falta {s}"
        shutil.copyfile(s, os.path.join(dst, src)); n_ok += 1
print(f"{n_ok} archivos publicados en public/")

# Diapositivas como imágenes para el visor de la app (public/presentaciones/semana-N/slide-K.jpg)
import subprocess, glob
for n in (1, 2, 3, 4):
    dst = os.path.join(C.PUB, "presentaciones", f"semana-{n}")
    os.makedirs(dst, exist_ok=True)
    for old in glob.glob(os.path.join(dst, "slide-*.jpg")):
        os.remove(old)
    subprocess.run(["pdftoppm", "-jpeg", "-jpegopt", "quality=82", "-r", "96", os.path.join(C.OUT, f"presentacion-semana-{n}.pdf"), os.path.join(dst, "slide")], check=True)
    for f in glob.glob(os.path.join(dst, "slide-*.jpg")):           # slide-1.jpg … (sin ceros a la izquierda)
        base = os.path.basename(f); num = int(base.split("-")[1].split(".")[0]); os.rename(f, os.path.join(dst, f"slide-{num}.jpg"))
    print(f"semana {n}: {len(glob.glob(os.path.join(dst, 'slide-*.jpg')))} diapositivas (imágenes)")
