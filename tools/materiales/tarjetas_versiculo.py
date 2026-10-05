"""Tarjetas de versículo RVR1960 para llevar a casa: fondo claro, poca tinta, tamaño carta."""
import os, json
from PIL import Image, ImageDraw, ImageFont
import common as C

DATOS = json.load(open(os.path.join(C.OUT, "datos.json")))
COMP = {1: "ill_sun.png", 2: "ill_mirror.png", 3: "ill_heart_hands.png", 4: "ill_treasure.png"}
NAVY = (14, 35, 56); GOLD = (185, 131, 42); GOLD_B = (217, 161, 63); PAPER = (250, 247, 240); INK = (43, 38, 32)
F = "/usr/share/fonts/truetype/dejavu/DejaVuSerif%s.ttf"
font = lambda n, b=True: ImageFont.truetype(F % ("-Bold" if b else ""), n)


def wrap(d, text, f, mw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textbbox((0, 0), t, font=f)[2] <= mw: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur]


for dt in DATOS:
    n = dt["week"]; W, H = 1700, 2200
    img = Image.new("RGB", (W, H), PAPER); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 26], fill=GOLD_B); d.rectangle([0, H - 26, W, H], fill=GOLD_B)
    d.rounded_rectangle([50, 60, W - 50, H - 60], radius=40, outline=GOLD_B, width=6)
    ctext = lambda t, y, s, col, b=True: d.text(((W - d.textbbox((0, 0), t, font=font(s, b))[2]) / 2, y), t, font=font(s, b), fill=col)
    lg = Image.open(C.logo_cimiento()).convert("RGBA"); lg.thumbnail((190, 140)); img.paste(lg, (100, 100), lg)
    ie = Image.open(C.logo_ieoh()).convert("RGBA"); ie.thumbnail((95, 95)); img.paste(ie, (300, 112), ie)
    ctext(f"SEMANA {n} · VERSÍCULO PARA LLEVAR A CASA", 150, 32, GOLD); ctext(dt["title"], 205, 54, NAVY)
    girl = Image.open(C.character("nina", "stand")).convert("RGBA"); boy = Image.open(C.character("nino", "wave")).convert("RGBA")
    girl.thumbnail((330, 470)); boy.thumbnail((330, 470))
    comp = Image.open(C.ill(COMP[n])).convert("RGBA"); comp.thumbnail((250, 250))
    img.paste(girl, (W // 2 - 400 - girl.width // 2 + 40, 320), girl); img.paste(boy, (W // 2 + 400 - boy.width // 2 - 40, 320), boy)
    img.paste(comp, (W // 2 - comp.width // 2, 340), comp)
    y = 320 + max(girl.height, boy.height) + 60
    text = dt["verse"]["text"]
    qs, lh = (34, 50) if len(text) > 180 else (40, 58) if len(text) > 100 else (46, 66)
    d.line([(300, y - 20), (1400, y - 20)], fill=GOLD_B, width=3); y += 20
    qf = font(qs)
    for ln in wrap(d, text, qf, W - 340):
        d.text(((W - d.textbbox((0, 0), ln, font=qf)[2]) / 2, y), ln, font=qf, fill=INK); y += lh
    y += 16; ctext(f'{dt["verse"]["ref"]} (RVR1960)', y, 30, GOLD); y += 64
    d.line([(300, y), (1400, y)], fill=GOLD_B, width=3); y += 46
    d.rounded_rectangle([460, y, 1240, y + 140], radius=30, fill=NAVY)
    phrase = f'"{dt["phrase"].rstrip(".")}."'
    pf = font(40); d.text(((W - d.textbbox((0, 0), phrase, font=pf)[2]) / 2, y + 48), phrase, font=pf, fill=(253, 252, 250))
    ctext("CIMIENTO · Construyendo vidas sobre Cristo.", 2110, 26, (130, 125, 115), False)
    img.save(os.path.join(C.OUT, f"versiculo-semana-{n}.pdf"), "PDF", resolution=150.0)
    img.save(os.path.join(C.OUT, f"versiculo-semana-{n}.png"))
    print(f"versiculo-semana-{n}.pdf")
