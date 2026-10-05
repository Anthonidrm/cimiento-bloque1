#!/usr/bin/env bash
# Regenera TODOS los materiales de las semanas desarrolladas y los copia a public/.
# Requisitos: Node 20+, Python 3.10+ (pip install -r requirements.txt), LibreOffice (soffice) y las fuentes DejaVu.
set -euo pipefail
cd "$(dirname "$0")/../.."
npx --yes tsx --tsconfig tsconfig.app.json tools/materiales/export_datos.ts
cd tools/materiales
[ -d node_modules/pptxgenjs ] || npm install --silent
python3 prep.py
node presentaciones.js
for n in $(python3 -c "import json;print(*[d['week'] for d in json.load(open('out/datos.json'))])"); do
  soffice --headless --convert-to pdf --outdir out "out/presentacion-semana-$n.pptx" >/dev/null 2>&1
done
python3 hojas_trabajo.py
python3 tarjetas_versiculo.py
python3 hojas_colorear.py
python3 guias_pdf.py
python3 publicar.py
