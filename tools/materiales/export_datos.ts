// Exporta los datos reales de las semanas desarrolladas a JSON para los generadores.
// Se ejecuta desde la raíz del repo:  npx tsx --tsconfig tsconfig.app.json tools/materiales/export_datos.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { weeks } from "../../src/data/weeks";
import { modules } from "../../src/data/modules";
import { buildGuideSections } from "../../src/data/guideSections";
import { getGuideExtras } from "../../src/data/guideExtras";

const out = weeks
  .filter((w) => w.status === "developed")
  .map((w) => {
    const ex = getGuideExtras(w.week)!;
    const mod = modules.find((m) => m.id === w.module)!;
    return {
      week: w.week,
      title: w.title,
      module: w.module,
      moduleTitle: mod.title,
      mainVerses: w.mainVerses,
      verse: w.verseRVR1960,
      phrase: ex.memoryPhrase,
      slides: ex.slides,
      sections: buildGuideSections(w),
    };
  });
mkdirSync("tools/materiales/out", { recursive: true });
writeFileSync("tools/materiales/out/datos.json", JSON.stringify(out, null, 1));
console.log(`datos.json: ${out.length} semanas`);
