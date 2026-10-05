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
