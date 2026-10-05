// Presentaciones para proyectar a los niños (9 diapositivas por semana).
// Los textos salen de src/data/guideExtras.ts (vía out/datos.json). Sin instrucciones del maestro.
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "out");
const CACHE = path.join(OUT, "cache");
const datos = JSON.parse(fs.readFileSync(path.join(OUT, "datos.json"), "utf8"));
const RATIO = 200 / 300; // proporción ancho/alto de los personajes
const NAVY_DARK = "0E2338", NAVY = "12304D", GOLD = "D9A13F", CREAM = "FDFCFA";

const f = (n) => path.join(CACHE, n);
const ch = (who, pose, x, y, h) => ({ f: `${who}_${pose}_900.png`, x, y, w: +(h * RATIO).toFixed(2), h });
const il = (n, x, y, w, h) => ({ f: n, x, y, w, h });
const put = (s, it) => s.addImage({ path: f(it.f), x: it.x, y: it.y, w: it.w, h: it.h });

// Disposición gráfica por semana (los textos vienen de los datos).
const L = {
  1: { title: [il("ill_tree.png", 0.9, 4.5, 2.3, 2.3), il("ill_sun.png", 9.6, 4.6, 2.1, 2.1), ch("nina", "wave", 5.6, 4.2, 2.9)],
       q2: ch("nino", "wave", 5.5, 3.3, 3.5), icons: ["ill_sun.png", "ill_tree.png", "ill_bird.png"], big: ch("nina", "wave", 5.8, 0.9, 3.2),
       act: [ch("nino", "wave", 0.6, 4.7, 2.4), il("ill_tree.png", 11.0, 5.0, 1.9, 1.9)] },
  2: { title: [il("ill_mirror.png", 8.0, 4.0, 2.2, 2.6), ch("nina", "wave", 5.0, 4.2, 2.9)],
       q2: il("ill_mirror.png", 5.4, 3.4, 2.5, 3.4), icons: ["ill_heart_hands.png", "nina_stand_900.png", "ill_tree.png"], big: il("ill_mirror.png", 5.4, 0.9, 2.5, 3.0),
       act: [ch("nino", "wave", 0.6, 4.7, 2.4), il("ill_mirror.png", 10.8, 4.7, 1.9, 2.2)] },
  3: { title: [il("ill_heart_hands.png", 8.0, 4.0, 2.5, 2.5), ch("nino", "wave", 4.9, 4.2, 2.9)],
       q2: il("ill_heart_hands.png", 5.4, 3.5, 2.5, 2.5), icons: ["ill_heart_hands.png", "nino_stand_900.png", "ill_sun.png"], big: il("ill_heart_hands.png", 5.15, 1.0, 3.0, 3.0),
       act: [il("ill_heart_hands.png", 0.7, 4.7, 2.2, 2.2), ch("nina", "wave", 10.7, 4.6, 2.5)] },
  4: { title: [il("ill_bird.png", 4.0, 4.6, 2.0, 1.2), ch("nino", "wave", 6.6, 4.2, 2.9)],
       q2: il("ill_treasure.png", 5.15, 4.2, 3.0, 2.5), icons: ["ill_sun.png", "ill_mirror.png", "ill_heart_hands.png"], big: ch("nina", "wave", 5.8, 0.9, 3.1),
       act: [il("ill_treasure.png", 0.6, 4.9, 2.3, 1.9), il("ill_bird.png", 10.6, 5.2, 2.0, 1.2)] },
};

function logos(s) {
  s.addImage({ path: f("logo-cimiento-small.png"), x: 0.35, y: 0.28, w: 0.9, h: 0.6 });
  s.addImage({ path: f("logo-ieoh-badge.png"), x: 1.35, y: 0.32, w: 0.5, h: 0.52 });
}
const verseSize = (t) => (t.length > 180 ? 22 : t.length > 100 ? 26 : 32);
const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, align: "center" }, o));

async function build(d) {
  const lay = L[d.week], sl = d.slides;
  const [idea1, idea2] = sl.mainIdea.split("... ");
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";

  let s = pres.addSlide(); s.background = { color: NAVY_DARK }; logos(s);
  T(s, sl.title, { x: 0.5, y: 2.0, w: 12.3, h: 1.6, fontFace: "Cambria", fontSize: 54, bold: true, color: CREAM });
  T(s, `CIMIENTO · Semana ${d.week}`, { x: 0.5, y: 3.5, w: 12.3, h: 0.6, fontFace: "Calibri", fontSize: 20, color: GOLD });
  lay.title.forEach((it) => put(s, it));

  s = pres.addSlide(); s.background = { color: CREAM };
  s.addShape("roundRect", { x: 0, y: 0, w: 13.33, h: 0.55, fill: { color: NAVY }, line: { type: "none" } });
  T(s, sl.initialQuestion, { x: 0.6, y: 2.0, w: 12.1, h: 1.8, fontFace: "Cambria", fontSize: 42, bold: true, color: NAVY_DARK });
  put(s, lay.q2);

  s = pres.addSlide(); s.background = { color: NAVY_DARK };
  T(s, idea1 + (idea2 ? "..." : ""), { x: 0.6, y: 1.7, w: 12.1, h: 1.1, fontFace: "Cambria", fontSize: 34, bold: true, color: CREAM });
  T(s, idea2 || "", { x: 0.6, y: 2.9, w: 12.1, h: 1.6, fontFace: "Cambria", fontSize: 44, bold: true, color: GOLD });

  s = pres.addSlide(); s.background = { color: CREAM };
  T(s, sl.teachingTitle, { x: 0.6, y: 0.55, w: 12.1, h: 1.5, fontFace: "Cambria", fontSize: 30, bold: true, color: NAVY_DARK });
  sl.teachingItems.forEach((label, i) => {
    const x = 1.1 + i * 3.85;
    s.addShape("ellipse", { x, y: 2.7, w: 2.3, h: 2.3, fill: { color: "FFFFFF" }, line: { color: GOLD, width: 3 } });
    s.addImage({ path: f(lay.icons[i]), x: x + 0.35, y: 3.05, w: 1.6, h: 1.6, sizing: { type: "contain", w: 1.6, h: 1.6 } });
    T(s, label, { x: x - 0.2, y: 5.2, w: 2.7, h: 0.9, fontFace: "Calibri", fontSize: 18, bold: true, color: NAVY_DARK });
  });

  s = pres.addSlide(); s.background = { color: NAVY_DARK };
  put(s, lay.big);
  T(s, sl.bigLine, { x: 0.6, y: 5.4, w: 12.1, h: 1.2, fontFace: "Cambria", fontSize: 34, bold: true, color: GOLD });

  s = pres.addSlide(); s.background = { color: CREAM };
  s.addShape("roundRect", { x: 1.0, y: 1.4, w: 11.3, h: 4.7, rectRadius: 0.25, fill: { color: "FFFFFF" }, line: { color: GOLD, width: 3 } });
  T(s, "💬", { x: 5.9, y: 1.7, w: 1.5, h: 1.2, fontSize: 54 });
  T(s, sl.participation, { x: 1.5, y: 3.0, w: 10.3, h: 2.6, fontFace: "Cambria", fontSize: 32, bold: true, color: NAVY_DARK });

  s = pres.addSlide(); s.background = { color: NAVY_DARK };
  s.addShape("line", { x: 3.9, y: 1.9, w: 5.5, h: 0, line: { color: GOLD, width: 2 } });
  T(s, `"${d.verse.text}"`, { x: 1.0, y: 2.2, w: 11.3, h: 2.3, fontFace: "Cambria", fontSize: verseSize(d.verse.text), italic: true, color: CREAM, valign: "middle" });
  T(s, `${d.verse.ref} (RVR1960)`, { x: 1.0, y: 4.7, w: 11.3, h: 0.6, fontFace: "Calibri", fontSize: 20, bold: true, color: GOLD });
  s.addShape("line", { x: 3.9, y: 5.5, w: 5.5, h: 0, line: { color: GOLD, width: 2 } });

  s = pres.addSlide(); s.background = { color: CREAM };
  T(s, "¡Manos a la obra!", { x: 0.6, y: 0.8, w: 12.1, h: 1.0, fontFace: "Cambria", fontSize: 38, bold: true, color: NAVY_DARK });
  T(s, "✏️", { x: 5.9, y: 1.9, w: 1.5, h: 1.3, fontSize: 60 });
  T(s, sl.activity, { x: 1.2, y: 3.4, w: 10.9, h: 1.8, fontFace: "Calibri", fontSize: 26, color: NAVY_DARK });
  lay.act.forEach((it) => put(s, it));

  s = pres.addSlide(); s.background = { color: NAVY_DARK }; logos(s);
  T(s, sl.closingPrayer, { x: 0.6, y: 2.3, w: 12.1, h: 2.2, fontFace: "Cambria", fontSize: 42, bold: true, color: CREAM });
  T(s, "Amén", { x: 0.6, y: 4.6, w: 12.1, h: 0.7, fontFace: "Calibri", fontSize: 24, color: GOLD });
  T(s, "CIMIENTO · Construyendo vidas sobre Cristo.", { x: 0.6, y: 6.9, w: 12.1, h: 0.5, fontFace: "Calibri", fontSize: 13, color: "9FB4C7" });

  await pres.writeFile({ fileName: path.join(OUT, `presentacion-semana-${d.week}.pptx`) });
}

(async () => { for (const d of datos) await build(d); console.log(`${datos.length} presentaciones generadas`); })();
